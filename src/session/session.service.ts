import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity, SessionStatus } from './session.entity';
import { Repository } from 'typeorm';
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
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(TranscriptEntity)
    private readonly transcriptRepository: Repository<TranscriptEntity>,
    @InjectRepository(AnalysisEntity)
    private readonly analysisRepository: Repository<AnalysisEntity>,
  ) {}

  /** 신규 세션 생성 */
  async create(user: UserEntity, language: string) {
    const session = this.sessionRepository.create({
      user, // 현재 로그인한 유저 설정, userId 자동 설정됨
      language
    });
    return this.sessionRepository.save(session);
  }

  /** 특정 유저의 세션 목록 조회 (최신순 정렬) */
  async findAll(userId: string): Promise<SessionEntity[]> {
    return this.sessionRepository.find({
      where: { user: { id: userId } },
      order: { createAt: 'DESC' },
      relations: ['transcript', 'analysis'],
    })
  }

  /** 세션 ID로 상세 정보 조회 (소유권 확인 포함) */
  async findOne(sessionId: string, userId?: string): Promise<SessionEntity | null> {
    const where: any = { id: sessionId };
    if (userId) {
      where.user = { id: userId };
    }
    return this.sessionRepository.findOne({
      where,
      relations: ['transcript', 'analysis'],
    })
  }

  /** 세션 삭제 (소유권 확인 + DB + 오디오 파일) */
  async remove(sessionId: string, userId: string): Promise<void> {
    const session = await this.findOne(sessionId, userId)

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
      session: { id: sessionId } as SessionEntity, // relation 기반으로 FK 설정
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
      session: { id: sessionId } as SessionEntity, // relation 기반으로 FK 설정
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
