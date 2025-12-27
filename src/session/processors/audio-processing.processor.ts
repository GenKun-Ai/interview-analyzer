import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SessionService } from '../session.service';
import { SttService } from 'src/stt/stt.service';
import { AnalysisService } from 'src/analysis/analysis.service';
import * as fs from 'fs/promises';

/**
 * 오디오 처리 워커 (Consumer)
 * BullMQ 큐에서 작업을 꺼내 백그라운드에서 STT + 분석 처리
 */
@Processor('audio-processing')
export class AudioProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(AudioProcessingProcessor.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly sttService: SttService,
    private readonly analysisService: AnalysisService,
  ) {
    super();
  }

  /**
   * 오디오 처리 메인 로직
   * @param job - BullMQ Job 객체 (data, progress 등 포함)
   */
  async process(job: Job<{
    sessionId: string;
    audioFilePath: string;
    originalName: string;
  }>): Promise<any> {
    const { sessionId, audioFilePath, originalName } = job.data;

    this.logger.log(`[작업 시작] Session: ${sessionId}, Job: ${job.id}`);

    try {
      // 1. 세션 조회
      const session = await this.sessionService.findOne(sessionId);
      if (!session) {
        throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
      }

      // 2. 상태 업데이트: TRANSCRIBING
      await this.sessionService.updateStatus(sessionId, 'TRANSCRIBING');
      await job.updateProgress(10);
      this.logger.log(`[10%] STT 처리 시작`);

      // 3. STT 처리
      const audioBuffer = await fs.readFile(audioFilePath);
      const sttResult = await this.sttService.transcribeAudio(
        audioBuffer,
        session.language,
        originalName,
      );

      await job.updateProgress(50);
      this.logger.log(`[50%] STT 완료, 분석 시작`);

      // 4. STT 결과 저장
      await this.sessionService.saveTranscript(sessionId, sttResult);
      await this.sessionService.updateSessionMetadata(sessionId, {
        audioDuration: Math.round(sttResult.duration),
      });

      // 5. 상태 업데이트: ANALYZING
      await this.sessionService.updateStatus(sessionId, 'ANALYZING');
      await job.updateProgress(60);

      // 6. 분석 처리
      const analysisResult = await this.analysisService.analyze(sttResult);

      await job.updateProgress(90);
      this.logger.log(`[90%] 분석 완료, 결과 저장 중`);

      // 7. 분석 결과 저장
      await this.sessionService.saveAnalysis(sessionId, analysisResult);

      // 8. 상태 업데이트: COMPLETED
      await this.sessionService.updateStatus(sessionId, 'COMPLETED');
      await job.updateProgress(100);

      // 9. 파일 정리 (옵션)
      if (session.deleteAfterAnalysis) {
        await this.sessionService.deleteAudioFile(audioFilePath);
        this.logger.log(`[정리] 오디오 파일 삭제: ${audioFilePath}`);
      }

      this.logger.log(`[작업 완료] Session: ${sessionId}, Job: ${job.id}`);

      return {
        sessionId,
        status: 'COMPLETED',
        sttDuration: sttResult.duration,
        analysisScore: analysisResult.overallScore,
      };

    } catch (error) {
      // 에러 정보 저장
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.sessionService.updateSessionMetadata(sessionId, {
        status: 'FAILED',
        errorMessage,
      });

      this.logger.error(
        `[작업 실패] Session: ${sessionId}, Job: ${job.id}`,
        error instanceof Error ? error.stack : error,
      );

      throw error; // BullMQ가 재시도 처리
    }
  }

  /**
   * 작업 완료 이벤트 핸들러
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(
      `[작업 성공] Job ${job.id} - Session ${result.sessionId}`,
    );
    // TODO: 웹소켓으로 프론트엔드에 알림
  }

  /**
   * 작업 실패 이벤트 핸들러
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `[작업 실패] Job ${job.id} - ${error.message}`,
      error.stack,
    );
    // TODO: 관리자에게 알림 (이메일, Slack 등)
  }

  /**
   * 작업 진행 중 이벤트 핸들러
   */
  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    this.logger.debug(`[진행 중] Job ${job.id} - ${progress}%`);
    // TODO: 웹소켓으로 실시간 진행률 전송
  }

  /**
   * 작업 활성화 이벤트 핸들러
   */
  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`[작업 활성화] Job ${job.id} 처리 시작`);
  }
}
