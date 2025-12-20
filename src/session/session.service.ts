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

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name)

  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    private readonly sttService: SttService,
    private analysisService: AnalysisService,
  ) {}

  async create(language: string) {
    const session = this.sessionRepository.create({ language })
    return this.sessionRepository.save(session)
  }

  async findOne(sessionId: string): Promise<SessionEntity | null> {
    return this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['transcript', 'analysis'],
    })
  }

  async createSession(dto: CreateSessionDto): Promise<SessionEntity> {
    const session = this.sessionRepository.create({
      language: dto.language,
      description: dto.description,
      status: 'CREATED',
    })
    return await this.sessionRepository.save(session)
  }

  // 전체 프로세스 관리
  async processAudio(sessionId: string, audioFile: Express.Multer.File) {
    // 0. Session 준비
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    })

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    // 1. Update Status
    await this.updateStatus(sessionId, 'TRANSCRIBING')

    try {
      // 2. STT Processing (음성 -> 텍스트)
      const sttResult = await this.sttService.transcribeAudio(
        audioFile.buffer,
        session.language,
      )
      // sttResult = { fullText: "...", segments: [...] }

      await this.saveTranscript(sessionId, sttResult)
      await this.updateStatus(sessionId, 'ANALYZING')

      // 3. Analysis: 분석 처리 (텍스트 -> 피드백)
      const analysisResult = await this.analysisService.analyze(sttResult)
      await this.saveAnalysis(sessionId, analysisResult)
      // analysisResult = { score: 85, feedbakcs: [...], ...}
      
      // 4. Complete
      await this.updateStatus(sessionId, 'COMPLETED')

      // 5. Cleanup if requested
      if (session.deleteAfterAnalysis) {
        await this.deleteAudioFile(session.originalAudioPath)
      }

      return { sttResult, analysisResult }
    } catch (error) {
      await this.updateStatus(sessionId, 'FAILED')
      throw error
    }
  }

  // ===== Private Helper Methods =====

  private async updateStatus(sessionId: string, status: string) {
    await this.sessionRepository.update(sessionId, { status } as any)
    this.logger.log(`Session ${sessionId} status updated to ${status}`)
  }

  private async saveTranscript(sessionId: string, sttResult: SttResult) {
    // TranscriptEntity 저장 로직 (차후 구현)
    this.logger.log(`Transcript saved for session ${sessionId}`)
    this.logger.log(`.   - Language: ${sttResult.language}`)
    this.logger.log(`.   - Duration: ${sttResult.duration}`)
    this.logger.log(`.   - Segments: ${sttResult.segments.length}`)
    // TODO: TranscriptRepository를 통한 저장 로직 추가
  }

  private async saveAnalysis(
    sessionId: string,
    analysisResult: AnalysisResult,
  ) {
    // AnalysisEntity 저장 로직 (차후 구현)
    this.logger.log(`Analysis saved for session ${sessionId}`)
    // TODO: AnalysisRepository를 통한 저장 로직 추가
  }

  private async deleteAudioFile(filePath?: string) {
    if (!filePath) return
    try {
      await fs.unlink(filePath)
      this.logger.log(`Audio file deleted: ${filePath}`)
    } catch (error) {
      this.logger.log(`Failed to delete audio files: ${filePath}`, error)
    }
  }
}
