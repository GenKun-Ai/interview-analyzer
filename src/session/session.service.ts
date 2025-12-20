import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from './session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { Repository } from 'typeorm';
import { SttService } from 'src/stt/stt.service';
import { AnalysisService } from 'src/analysis/analysis.service';
import type { SttResult } from 'src/common/interfaces/stt-engine.interface';
import type { AnalysisResult } from 'src/common/interfaces/analysis-engine.interface';
import * as fs from 'fs/promises';

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
    private readonly sttService: SttService,                       // STT 서비스 주입
    private analysisService: AnalysisService,                     // 분석 서비스 주입
  ) {}

  /** 신규 세션 생성 */
  async create(language: string) {
    const session = this.sessionRepository.create({ language }) // 언어 설정하여 세션 객체 생성
    return this.sessionRepository.save(session) // DB에 저장
  }

  /** 세션 ID로 상세 정보 조회 (Transcript, Analysis 포함) */
  async findOne(sessionId: string): Promise<SessionEntity | null> {
    // ID로 세션 찾고, 연관된 transcript와 analysis도 함께 로드함
    return this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['transcript', 'analysis'],
    })
  }

  /** DTO 기반 신규 세션 생성 */
  async createSession(dto: CreateSessionDto): Promise<SessionEntity> {
    const session = this.sessionRepository.create({
      language: dto.language, // DTO에서 언어 가져옴
      description: dto.description, // DTO에서 설명 가져옴
      status: 'CREATED', // 초기 상태는 'CREATED'로 설정함
    })
    return await this.sessionRepository.save(session) // DB에 저장
  }

  /**
   * 오디오 처리 파이프라인 시작
   * 1. 세션 확인
   * 2. 상태: TRANSCRIBING
   * 3. STT 서비스 호출 (음성 -> 텍스트)
   * 4. 텍스트 저장 (DB TODO)
   * 5. 상태: ANALYZING
   * 6. 분석 서비스 호출 (텍스트 -> 피드백)
   * 7. 분석 결과 저장 (DB TODO)
   * 8. 상태: COMPLETED
   * 9. 요청 시 오디오 파일 정리
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
    // 1. Update Status
    await this.updateStatus(sessionId, 'TRANSCRIBING') // 상태를 'TRANSCRIBING'으로 변경

    try {
      // 2. STT Processing (음성 -> 텍스트)
      const sttResult = await this.sttService.transcribeAudio(
        audioFile.buffer, // 오디오 버퍼 전달
        session.language, // 세션에 설정된 언어 사용
      )
      // sttResult = { fullText: "...", segments: [...] }

      await this.saveTranscript(sessionId, sttResult) // STT 결과 저장
      await this.updateStatus(sessionId, 'ANALYZING') // 상태를 'ANALYZING'으로 변경

      // 3. Analysis: 분석 처리 (텍스트 -> 피드백)
      const analysisResult = await this.analysisService.analyze(sttResult)
      await this.saveAnalysis(sessionId, analysisResult) // 분석 결과 저장
      // analysisResult = { score: 85, feedbakcs: [...], ...}
      
      // 4. Complete
      await this.updateStatus(sessionId, 'COMPLETED') // 상태를 'COMPLETED'로 변경

      // 5. Cleanup if requested
      if (session.deleteAfterAnalysis) {
        await this.deleteAudioFile(session.originalAudioPath) // 분석 후 오디오 삭제 옵션 처리
      }

      return { sttResult, analysisResult } // 최종 결과 반환
    } catch (error) {
      await this.updateStatus(sessionId, 'FAILED') // 에러 발생 시 상태 'FAILED'로 변경
      throw error // 에러 다시 던짐
    }
  }

  // ===== Private Helper Methods =====

  /** 세션 상태 업데이트 */
  private async updateStatus(sessionId: string, status: string) {
    await this.sessionRepository.update(sessionId, { status } as any) // ID로 세션 상태 업데이트함
    this.logger.log(`Session ${sessionId} status updated to ${status}`) // 로그 남김
  }

  /** STT 결과 저장 로직 (현재 TODO) */
  private async saveTranscript(sessionId: string, sttResult: SttResult) {
    // TranscriptEntity 저장 로직 (차후 구현)
    this.logger.log(`Transcript saved for session ${sessionId}`) // 로그 남김
    this.logger.log(`.   - Language: ${sttResult.language}`) // 언어 로그
    this.logger.log(`.   - Duration: ${sttResult.duration}`) // 길이 로그
    this.logger.log(`.   - Segments: ${sttResult.segments.length}`) // 세그먼트 수 로그
    // TODO: TranscriptRepository를 통한 저장 로직 추가해야 함
  }

  /** 분석 결과 저장 로직 (현재 TODO) */
  private async saveAnalysis(
    sessionId: string,
    analysisResult: AnalysisResult,
  ) {
    // AnalysisEntity 저장 로직 (차후 구현)
    this.logger.log(`Analysis saved for session ${sessionId}`) // 로그 남김
    // TODO: AnalysisRepository를 통한 저장 로직 추가해야 함
  }

  /** 오디오 파일 삭제 */
  private async deleteAudioFile(filePath?: string) {
    if (!filePath) return // 파일 경로 없으면 아무것도 안 함
    try {
      await fs.unlink(filePath) // 파일 시스템에서 파일 삭제
      this.logger.log(`Audio file deleted: ${filePath}`) // 성공 로그
    } catch (error) {
      this.logger.log(`Failed to delete audio files: ${filePath}`, error) // 실패 로그
    }
  }
}
