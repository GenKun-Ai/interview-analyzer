import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity, SessionStatus } from './session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { Repository } from 'typeorm';
import { SttService } from 'src/stt/stt.service';
import { AnalysisService } from 'src/analysis/analysis.service';
import type { SttResult } from 'src/common/interfaces/stt-engine.interface';
import type { AnalysisResult } from 'src/common/interfaces/analysis-engine.interface';
import * as fs from 'fs/promises';
import { TranscriptEntity } from 'src/stt/entities/transcript.entity';
import { AnalysisEntity } from 'src/analysis/entities/analysis.entity';
import { UserEntity } from 'src/users/entities/user.entity';

/**
 * 오디오 처리 워크플로우 총괄 서비스
 * STT, 분석 과정 관리, 세션 상태 업데이트
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name) // 로거 인스턴스 생성함

  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>, // 세션 DB 접근용 리포지토리
    @InjectRepository(TranscriptEntity)
    private readonly transcriptRepository: Repository<TranscriptEntity>, // Transcript DB 접근용 리포지토리
    @InjectRepository(AnalysisEntity)
    private readonly analysisRepository: Repository<AnalysisEntity>, // Analysis DB 접근용 리포지토리
    private readonly sttService: SttService,                       // STT 서비스 주입
    private analysisService: AnalysisService,                     // 분석 서비스 주입
  ) {}

  /** 신규 세션 생성 */
  async create(user: UserEntity, language: string) {
    const session = this.sessionRepository.create({
      user, // 현재 로그인한 유저 설정, userId 자동 설정됨
      language
    });
    return this.sessionRepository.save(session);
  }

  /** 모든 세션 목록 조회 (최신순 정렬) */
  async findAll(): Promise<SessionEntity[]> {
    return this.sessionRepository.find({
      order: { createAt: 'DESC' }, // 최신 생성 순으로 정렬
      relations: ['transcript', 'analysis'], // 연관 데이터 포함
    })
  }

  /** 세션 ID로 상세 정보 조회 (Transcript, Analysis 포함) */
  async findOne(sessionId: string): Promise<SessionEntity | null> {
    // ID로 세션 찾고, 연관된 transcript와 analysis도 함께 로드함
    return this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['transcript', 'analysis'],
    })
  }

  /** 세션 삭제 (DB + 오디오 파일) */
  async remove(sessionId: string): Promise<void> {
    const session = await this.findOne(sessionId)

    if (!session) {
      throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`)
    }

    // 1. 오디오 파일 삭제 (있으면)
    if (session.originalAudioPath) {
      await this.deleteAudioFile(session.originalAudioPath)
    }

    // 2. DB에서 세션 삭제 (Cascade로 Transcript, Analysis 자동 삭제)
    await this.sessionRepository.remove(session)
    this.logger.log(`세션 삭제 완료: ${sessionId}`)
  }

  /** DTO 기반 신규 세션 생성 */
  async createSession(dto: CreateSessionDto): Promise<SessionEntity> {
    const session = this.sessionRepository.create({
      userId: dto.userId,
      language: dto.language, // DTO에서 언어 가져옴
      description: dto.description, // DTO에서 설명 가져옴
      status: 'CREATED', // 초기 상태는 'CREATED'로 설정함
    })
    return await this.sessionRepository.save(session) // DB에 저장
  }

  /**
   * 오디오 처리 파이프라인 시작
   * 1. 세션 확인
   * 2. 파일 메타데이터 저장
   * 3. 상태: TRANSCRIBING
   * 4. STT 서비스 호출 (음성 -> 텍스트)
   * 5. 텍스트 저장 + 오디오 길이 업데이트
   * 6. 상태: ANALYZING
   * 7. 분석 서비스 호출 (텍스트 -> 피드백)
   * 8. 분석 결과 저장
   * 9. 상태: COMPLETED
   * 10. 요청 시 오디오 파일 정리
   * 실패 시 상태: FAILED 처리
   * @param sessionId - 처리할 세션 ID
   * @param audioFile - 처리할 오디오 파일 (Express.Multer.File 형식)
   * @returns STT 결과 및 분석 결과
   */
  async processAudio(sessionId: string, audioFile: Express.Multer.File) {
    // 0. Session 준비
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    })

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`) // 세션 없으면 에러 발생
    }

    // 1. 파일 메타데이터 저장
    await this.updateSessionMetadata(sessionId, {
      originalAudioPath: audioFile.path, // 디스크에 저장된 실제 경로
      status: 'UPLOADING',
    })
    this.logger.log(`파일 저장 완료: ${audioFile.path} (크기: ${audioFile.size} bytes)`)

    // 2. Update Status
    await this.updateStatus(sessionId, 'TRANSCRIBING') // 상태를 'TRANSCRIBING'으로 변경

    try {
      // 3. STT Processing (음성 -> 텍스트)
      // 디스크 모드: 파일에서 Buffer 읽기
      const audioBuffer = await fs.readFile(audioFile.path)

      const sttResult = await this.sttService.transcribeAudio(
        audioBuffer, // 디스크에서 읽은 버퍼 전달
        session.language, // 세션에 설정된 언어 사용
        audioFile.originalname, // 기존 파일명
      )
      // sttResult = { fullText: "...", segments: [...], duration: X }

      // 4. STT 결과 저장 + 오디오 길이 업데이트
      await this.saveTranscript(sessionId, sttResult) // STT 결과 저장
      await this.updateSessionMetadata(sessionId, {
        audioDuration: Math.round(sttResult.duration), // 정수로 변환하여 저장
      })
      this.logger.log(`Audio duration saved: ${sttResult.duration}s`)

      await this.updateStatus(sessionId, 'ANALYZING') // 상태를 'ANALYZING'으로 변경

      // 5. Analysis: 분석 처리 (텍스트 -> 피드백)
      const analysisResult = await this.analysisService.analyze(sttResult)
      await this.saveAnalysis(sessionId, analysisResult) // 분석 결과 저장
      // analysisResult = { score: 85, feedbakcs: [...], ...}

      // 6. Complete
      await this.updateStatus(sessionId, 'COMPLETED') // 상태를 'COMPLETED'로 변경

      // 7. Cleanup if requested
      if (session.deleteAfterAnalysis) {
        await this.deleteAudioFile(session.originalAudioPath) // 분석 후 오디오 삭제 옵션 처리
      }

      return { sttResult, analysisResult } // 최종 결과 반환
    } catch (error) {
      // 에러 정보 저장
      const errorMessage = error instanceof Error ? error.message : String(error)
      await this.updateSessionMetadata(sessionId, {
        status: 'FAILED',
        errorMessage,
      })
      this.logger.error(`Session ${sessionId} failed: ${errorMessage}`)
      throw error // 에러 다시 던짐
    }
  }

  // ===== Public Helper Methods (Processor에서 사용) =====

  /** 세션 상태 업데이트 */
  async updateStatus(sessionId: string, status: SessionStatus) {
    await this.sessionRepository.update(sessionId, { status }) // ID로 세션 상태 업데이트함
    this.logger.log(`Session ${sessionId} status updated to ${status}`) // 로그 남김
  }

  /** 세션 메타데이터 업데이트 (파일 경로, 오디오 길이 등) */
  async updateSessionMetadata(
    sessionId: string,
    metadata: Partial<SessionEntity>,
  ) {
    await this.sessionRepository.update(sessionId, metadata) // 메타데이터 업데이트
    this.logger.log(`Session ${sessionId} metadata updated`)
  }

  /** STT 결과 저장 로직 */
  async saveTranscript(sessionId: string, sttResult: SttResult) {

    const transcript = this.transcriptRepository.create({
      sessionId,
      fullText: sttResult.fullText,
      language: sttResult.language,
      duration: sttResult.duration,
      segments: sttResult.segments, // 공통 인터페이스 사용으로 직접 할당 가능
      speakers: sttResult.speakers,
    })

    await this.transcriptRepository.save(transcript)
    this.logger.log(`Transcript saved for session ${sessionId}`) // 로그 남김
    this.logger.log(`.   - Language: ${sttResult.language}`) // 언어 로그
    this.logger.log(`.   - Duration: ${sttResult.duration}`) // 길이 로그
    this.logger.log(`.   - Segments: ${sttResult.segments.length}`) // 세그먼트 수 로그
  }

  /** 분석 결과 저장 로직 */
  async saveAnalysis(
    sessionId: string,
    analysisResult: AnalysisResult,
  ) {
    const analysis = this.analysisRepository.create({
      sessionId,
      structuralAnalysis: analysisResult.structuralAnalysis,
      speechHabits: analysisResult.speechHabits,
      overallScore: analysisResult.overallScore,
      recommendations: analysisResult.recommendations,
      engineUsed: 'gpt-4o-mini', // 사용된 분석 엔진 기록
    })

    await this.analysisRepository.save(analysis)
    this.logger.log(`Analysis saved for session ${sessionId}`) // 로그 남김
    this.logger.log(`.   - Overall Score: ${analysisResult.overallScore}`) // 점수 로그
    this.logger.log(`.   - Recommendations: ${analysisResult.recommendations.length}`) // 추천사항 수 로그
  }

  /** 오디오 파일 삭제 */
  async deleteAudioFile(filePath?: string) {
    if (!filePath) return // 파일 경로 없으면 아무것도 안 함
    try {
      await fs.unlink(filePath) // 파일 시스템에서 파일 삭제
      this.logger.log(`Audio file deleted: ${filePath}`) // 성공 로그
    } catch (error) {
      this.logger.log(`Failed to delete audio files: ${filePath}`, error) // 실패 로그
    }
  }
}
