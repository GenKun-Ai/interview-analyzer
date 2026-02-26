import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import * as fs from 'fs/promises';
import { AudioProcessingProcessor } from './audio-processing.processor';
import { SessionService } from '../session.service';
import { SttService } from 'src/stt/stt.service';
import { AnalysisService } from 'src/analysis/analysis.service';
import { SessionEntity } from '../session.entity';
import type { SttResult } from 'src/common/interfaces/stt-engine.interface';
import type { AnalysisResult } from 'src/common/interfaces/analysis-engine.interface';

jest.mock('fs/promises');

describe('AudioProcessingProcessor', () => {
  let processor: AudioProcessingProcessor;
  let sessionService: jest.Mocked<SessionService>;
  let sttService: jest.Mocked<SttService>;
  let analysisService: jest.Mocked<AnalysisService>;

  // ── 공통 목 데이터 ──────────────────────────────────────────────────────────
  const mockSession: Partial<SessionEntity> = {
    id: 'session-id-1',
    language: 'ko',
    status: 'CREATED',
    deleteAfterAnalysis: false,
  };

  const mockSttResult: SttResult = {
    fullText: '안녕하세요 저는 개발자입니다',
    segments: [
      { id: 'seg-1', text: '안녕하세요', startTime: 0, endTime: 1.5, confidence: 0.95 },
    ],
    language: 'ko',
    duration: 3.2,
  };

  const mockAnalysisResult: AnalysisResult = {
    structuralAnalysis: {
      questionResponsePairs: [],
      appropriatenessScore: 0.85,
      keywordMatches: [],
    },
    speechHabits: {
      silenceDurations: [],
      fillerWords: [],
      speakingRate: 120,
      averagePauseDuration: 0.3,
    },
    overallScore: 85,
    recommendations: ['발음을 명확히 하세요'],
  };

  // BullMQ Job 목 팩토리
  const createMockJob = (data?: Partial<{
    sessionId: string;
    audioFilePath: string;
    originalName: string;
  }>): jest.Mocked<Job> => ({
    id: 'job-id-1',
    data: {
      sessionId: 'session-id-1',
      audioFilePath: './uploads/session-id-1/audio.mp3',
      originalName: 'audio.mp3',
      ...data,
    },
    updateProgress: jest.fn(),
  } as unknown as jest.Mocked<Job>);

  // ── 셋업 ───────────────────────────────────────────────────────────────────
  beforeEach(async () => {
    const mockSessionService = {
      findOne: jest.fn(),
      updateStatus: jest.fn(),
      saveTranscript: jest.fn(),
      updateSessionMetadata: jest.fn(),
      saveAnalysis: jest.fn(),
      deleteAudioFile: jest.fn(),
    };

    const mockSttService = {
      transcribeAudio: jest.fn(),
    };

    const mockAnalysisService = {
      analyze: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioProcessingProcessor,
        { provide: SessionService, useValue: mockSessionService },
        { provide: SttService, useValue: mockSttService },
        { provide: AnalysisService, useValue: mockAnalysisService },
      ],
    }).compile();

    processor = module.get<AudioProcessingProcessor>(AudioProcessingProcessor);
    sessionService = module.get(SessionService);
    sttService = module.get(SttService);
    analysisService = module.get(AnalysisService);
  });

  afterEach(() => jest.clearAllMocks());

  it('프로세서가 정의되어야 함', () => {
    expect(processor).toBeDefined();
  });

  // ── process() ──────────────────────────────────────────────────────────────
  describe('process', () => {
    beforeEach(() => {
      // 정상 흐름 기본 목킹
      sessionService.findOne.mockResolvedValue(mockSession as SessionEntity);
      sessionService.updateStatus.mockResolvedValue(undefined);
      sessionService.saveTranscript.mockResolvedValue(undefined);
      sessionService.updateSessionMetadata.mockResolvedValue(undefined);
      sessionService.saveAnalysis.mockResolvedValue(undefined);
      sessionService.deleteAudioFile.mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('audio data'));
      sttService.transcribeAudio.mockResolvedValue(mockSttResult);
      analysisService.analyze.mockResolvedValue(mockAnalysisResult);
    });

    describe('정상 흐름', () => {
      it('전체 파이프라인을 순서대로 실행하고 결과를 반환해야 함', async () => {
        // Given
        const job = createMockJob();

        // When
        const result = await processor.process(job);

        // Then
        // 1. 세션 조회
        expect(sessionService.findOne).toHaveBeenCalledWith('session-id-1');

        // 2. 상태 전이: TRANSCRIBING
        expect(sessionService.updateStatus).toHaveBeenCalledWith('session-id-1', 'TRANSCRIBING');
        expect(job.updateProgress).toHaveBeenCalledWith(10);

        // 3. STT 처리
        expect(fs.readFile).toHaveBeenCalledWith('./uploads/session-id-1/audio.mp3');
        expect(sttService.transcribeAudio).toHaveBeenCalledWith(
          expect.any(Buffer),
          'ko',
          'audio.mp3',
        );
        expect(job.updateProgress).toHaveBeenCalledWith(50);

        // 4. STT 결과 저장
        expect(sessionService.saveTranscript).toHaveBeenCalledWith('session-id-1', mockSttResult);
        expect(sessionService.updateSessionMetadata).toHaveBeenCalledWith(
          'session-id-1',
          { audioDuration: Math.round(mockSttResult.duration) },
        );

        // 5. 상태 전이: ANALYZING
        expect(sessionService.updateStatus).toHaveBeenCalledWith('session-id-1', 'ANALYZING');
        expect(job.updateProgress).toHaveBeenCalledWith(60);

        // 6. 분석 처리
        expect(analysisService.analyze).toHaveBeenCalledWith(mockSttResult);
        expect(job.updateProgress).toHaveBeenCalledWith(90);

        // 7. 분석 결과 저장
        expect(sessionService.saveAnalysis).toHaveBeenCalledWith('session-id-1', mockAnalysisResult);

        // 8. 상태 전이: COMPLETED
        expect(sessionService.updateStatus).toHaveBeenCalledWith('session-id-1', 'COMPLETED');
        expect(job.updateProgress).toHaveBeenCalledWith(100);

        // 반환값
        expect(result).toEqual({
          sessionId: 'session-id-1',
          status: 'COMPLETED',
          sttDuration: mockSttResult.duration,
          analysisScore: mockAnalysisResult.overallScore,
        });
      });

      it('진행률이 10 → 50 → 60 → 90 → 100 순서로 업데이트되어야 함', async () => {
        // Given
        const job = createMockJob();
        const progressCalls: number[] = [];
        job.updateProgress.mockImplementation(async (p: number) => {
          progressCalls.push(p);
        });

        // When
        await processor.process(job);

        // Then
        expect(progressCalls).toEqual([10, 50, 60, 90, 100]);
      });

      it('deleteAfterAnalysis가 false면 오디오 파일을 삭제하지 않아야 함', async () => {
        // Given
        const job = createMockJob();
        sessionService.findOne.mockResolvedValue({
          ...mockSession,
          deleteAfterAnalysis: false,
        } as SessionEntity);

        // When
        await processor.process(job);

        // Then
        expect(sessionService.deleteAudioFile).not.toHaveBeenCalled();
      });

      it('deleteAfterAnalysis가 true면 완료 후 오디오 파일을 삭제해야 함', async () => {
        // Given
        const job = createMockJob();
        sessionService.findOne.mockResolvedValue({
          ...mockSession,
          deleteAfterAnalysis: true,
        } as SessionEntity);

        // When
        await processor.process(job);

        // Then
        expect(sessionService.deleteAudioFile).toHaveBeenCalledWith(
          './uploads/session-id-1/audio.mp3',
        );
      });
    });

    describe('에러 처리', () => {
      it('세션이 없으면 FAILED 상태로 저장하고 에러를 던져야 함', async () => {
        // Given
        const job = createMockJob();
        sessionService.findOne.mockResolvedValue(null);

        // When & Then
        await expect(processor.process(job)).rejects.toThrow(
          '세션을 찾을 수 없습니다: session-id-1',
        );

        expect(sessionService.updateSessionMetadata).toHaveBeenCalledWith(
          'session-id-1',
          expect.objectContaining({ status: 'FAILED' }),
        );
      });

      it('STT 실패 시 FAILED 상태로 저장하고 에러를 전파해야 함', async () => {
        // Given
        const job = createMockJob();
        sttService.transcribeAudio.mockRejectedValue(new Error('Whisper API 오류'));

        // When & Then
        await expect(processor.process(job)).rejects.toThrow('Whisper API 오류');

        expect(sessionService.updateSessionMetadata).toHaveBeenCalledWith(
          'session-id-1',
          expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'Whisper API 오류',
          }),
        );
      });

      it('분석 실패 시 FAILED 상태로 저장하고 에러를 전파해야 함', async () => {
        // Given
        const job = createMockJob();
        analysisService.analyze.mockRejectedValue(new Error('GPT API 오류'));

        // When & Then
        await expect(processor.process(job)).rejects.toThrow('GPT API 오류');

        expect(sessionService.updateSessionMetadata).toHaveBeenCalledWith(
          'session-id-1',
          expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'GPT API 오류',
          }),
        );
      });

      it('에러가 Error 인스턴스가 아닌 경우에도 errorMessage를 문자열로 저장해야 함', async () => {
        // Given
        const job = createMockJob();
        sttService.transcribeAudio.mockRejectedValue('알 수 없는 오류');

        // When & Then
        await expect(processor.process(job)).rejects.toBe('알 수 없는 오류');

        expect(sessionService.updateSessionMetadata).toHaveBeenCalledWith(
          'session-id-1',
          expect.objectContaining({
            status: 'FAILED',
            errorMessage: '알 수 없는 오류',
          }),
        );
      });

      it('파일 읽기 실패 시 FAILED 상태로 저장하고 에러를 전파해야 함', async () => {
        // Given
        const job = createMockJob();
        (fs.readFile as jest.Mock).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

        // When & Then
        await expect(processor.process(job)).rejects.toThrow('파일을 찾을 수 없습니다');

        expect(sessionService.updateSessionMetadata).toHaveBeenCalledWith(
          'session-id-1',
          expect.objectContaining({ status: 'FAILED' }),
        );
      });
    });
  });

  // ── 이벤트 핸들러 ──────────────────────────────────────────────────────────
  describe('이벤트 핸들러', () => {
    const mockJob = { id: 'job-id-1' } as Job;

    it('onCompleted: 에러 없이 실행되어야 함', () => {
      expect(() =>
        processor.onCompleted(mockJob, { sessionId: 'session-id-1' }),
      ).not.toThrow();
    });

    it('onFailed: 에러 없이 실행되어야 함', () => {
      expect(() =>
        processor.onFailed(mockJob, new Error('테스트 에러')),
      ).not.toThrow();
    });

    it('onProgress: 에러 없이 실행되어야 함', () => {
      expect(() => processor.onProgress(mockJob, 50)).not.toThrow();
    });

    it('onActive: 에러 없이 실행되어야 함', () => {
      expect(() => processor.onActive(mockJob)).not.toThrow();
    });
  });
});
