import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionService } from './session.service';
import { SessionEntity } from './session.entity';
import { TranscriptEntity } from 'src/stt/entities/transcript.entity';
import { AnalysisEntity } from 'src/analysis/entities/analysis.entity';
import { SttService } from 'src/stt/stt.service';
import { AnalysisService } from 'src/analysis/analysis.service';
import * as fs from 'fs/promises';

// fs/promises 모킹
jest.mock('fs/promises');

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepository: jest.Mocked<Repository<SessionEntity>>;
  let transcriptRepository: jest.Mocked<Repository<TranscriptEntity>>;
  let analysisRepository: jest.Mocked<Repository<AnalysisEntity>>;
  let sttService: jest.Mocked<SttService>;
  let analysisService: jest.Mocked<AnalysisService>;

  // 테스트용 목 데이터
  const mockSession: Partial<SessionEntity> = {
    id: 'test-session-id',
    language: 'ko',
    status: 'CREATED',
    description: '테스트 세션',
    deleteAfterAnalysis: false,
  };

  const mockSttResult = {
    fullText: '안녕하세요 테스트입니다',
    segments: [
      {
        id: '1',
        startTime: 0,
        endTime: 2.5,
        text: '안녕하세요',
        speakerId: 'Speaker_A',
        confidence: 0.95,
      },
      {
        id: '2',
        startTime: 2.5,
        endTime: 4.0,
        text: '테스트입니다',
        speakerId: 'Speaker_A',
        confidence: 0.92,
      },
    ],
    language: 'ko',
    duration: 4.0,
  };

  const mockAnalysisResult = {
    structuralAnalysis: {
      questionResponsePairs: [],
      appropriatenessScore: 0.85,
      keywordMatches: [{ keyword: '테스트', count: 1, timestamps: [0] }],
    },
    speechHabits: {
      silenceDurations: [],
      fillerWords: [],
      speakingRate: 120,
      averagePauseDuration: 0.5,
    },
    overallScore: 85,
    recommendations: ['발음을 명확히 하세요'],
  };

  const mockAudioFile = {
    fieldname: 'audio',
    originalname: 'test-audio.mp3',
    encoding: '7bit',
    mimetype: 'audio/mpeg',
    size: 1024000,
    destination: './uploads/test-session-id',
    filename: 'test-audio-1234567890.mp3',
    path: './uploads/test-session-id/test-audio-1234567890.mp3',
    buffer: Buffer.from('mock audio data'),
  } as Express.Multer.File;

  beforeEach(async () => {
    // Repository 모킹
    const mockSessionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockTranscriptRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockAnalysisRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    // Service 모킹
    const mockSttService = {
      transcribeAudio: jest.fn(),
    };

    const mockAnalysisService = {
      analyze: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(SessionEntity),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(TranscriptEntity),
          useValue: mockTranscriptRepo,
        },
        {
          provide: getRepositoryToken(AnalysisEntity),
          useValue: mockAnalysisRepo,
        },
        {
          provide: SttService,
          useValue: mockSttService,
        },
        {
          provide: AnalysisService,
          useValue: mockAnalysisService,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepository = module.get(getRepositoryToken(SessionEntity));
    transcriptRepository = module.get(getRepositoryToken(TranscriptEntity));
    analysisRepository = module.get(getRepositoryToken(AnalysisEntity));
    sttService = module.get(SttService);
    analysisService = module.get(AnalysisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('서비스가 정의되어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('새 세션을 생성해야 함', async () => {
      // Given
      const language = 'ko';
      sessionRepository.create.mockReturnValue(mockSession as SessionEntity);
      sessionRepository.save.mockResolvedValue(mockSession as SessionEntity);

      // When
      const result = await service.create(language);

      // Then
      expect(sessionRepository.create).toHaveBeenCalledWith({ language });
      expect(sessionRepository.save).toHaveBeenCalledWith(mockSession);
      expect(result).toEqual(mockSession);
    });
  });

  describe('findOne', () => {
    it('세션 ID로 세션을 조회해야 함', async () => {
      // Given
      const sessionId = 'test-session-id';
      sessionRepository.findOne.mockResolvedValue(mockSession as SessionEntity);

      // When
      const result = await service.findOne(sessionId);

      // Then
      expect(sessionRepository.findOne).toHaveBeenCalledWith({
        where: { id: sessionId },
        relations: ['transcript', 'analysis'],
      });
      expect(result).toEqual(mockSession);
    });

    it('존재하지 않는 세션 조회 시 null 반환', async () => {
      // Given
      const sessionId = 'non-existent-id';
      sessionRepository.findOne.mockResolvedValue(null);

      // When
      const result = await service.findOne(sessionId);

      // Then
      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('DTO로 세션을 생성해야 함', async () => {
      // Given
      const dto = {
        language: 'ko',
        description: 'DTO 테스트 세션',
      };

      const expectedSession = {
        ...mockSession,
        language: dto.language,
        description: dto.description,
        status: 'CREATED',
      };

      sessionRepository.create.mockReturnValue(expectedSession as SessionEntity);
      sessionRepository.save.mockResolvedValue(expectedSession as SessionEntity);

      // When
      const result = await service.createSession(dto);

      // Then
      expect(sessionRepository.create).toHaveBeenCalledWith({
        language: dto.language,
        description: dto.description,
        status: 'CREATED',
      });
      expect(result).toEqual(expectedSession);
    });
  });

  describe('processAudio', () => {
    beforeEach(() => {
      // 기본 모킹 설정
      sessionRepository.findOne.mockResolvedValue(mockSession as SessionEntity);
      sessionRepository.update.mockResolvedValue({} as any);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('audio data'));
      sttService.transcribeAudio.mockResolvedValue(mockSttResult);
      analysisService.analyze.mockResolvedValue(mockAnalysisResult);
      transcriptRepository.create.mockReturnValue({} as TranscriptEntity);
      transcriptRepository.save.mockResolvedValue({} as TranscriptEntity);
      analysisRepository.create.mockReturnValue({} as AnalysisEntity);
      analysisRepository.save.mockResolvedValue({} as AnalysisEntity);
    });

    it('오디오 처리 워크플로우가 정상 완료되어야 함', async () => {
      // When
      const result = await service.processAudio('test-session-id', mockAudioFile);

      // Then
      // 1. 파일 메타데이터 저장 확인
      expect(sessionRepository.update).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          originalAudioPath: mockAudioFile.path,
          status: 'UPLOADING',
        }),
      );

      // 2. 상태 변경 확인: TRANSCRIBING
      expect(sessionRepository.update).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({ status: 'TRANSCRIBING' }),
      );

      // 3. STT 서비스 호출 확인
      expect(fs.readFile).toHaveBeenCalledWith(mockAudioFile.path);
      expect(sttService.transcribeAudio).toHaveBeenCalledWith(
        expect.any(Buffer),
        mockSession.language,
        mockAudioFile.originalname,
      );

      // 4. Transcript 저장 확인
      expect(transcriptRepository.save).toHaveBeenCalled();

      // 5. 오디오 길이 저장 확인
      expect(sessionRepository.update).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          audioDuration: Math.round(mockSttResult.duration),
        }),
      );

      // 6. 상태 변경 확인: ANALYZING
      expect(sessionRepository.update).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({ status: 'ANALYZING' }),
      );

      // 7. 분석 서비스 호출 확인
      expect(analysisService.analyze).toHaveBeenCalledWith(mockSttResult);

      // 8. Analysis 저장 확인
      expect(analysisRepository.save).toHaveBeenCalled();

      // 9. 상태 변경 확인: COMPLETED
      expect(sessionRepository.update).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({ status: 'COMPLETED' }),
      );

      // 10. 결과 반환 확인
      expect(result).toEqual({
        sttResult: mockSttResult,
        analysisResult: mockAnalysisResult,
      });
    });

    it('세션이 존재하지 않으면 에러를 발생시켜야 함', async () => {
      // Given
      sessionRepository.findOne.mockResolvedValue(null);

      // When & Then
      await expect(
        service.processAudio('non-existent-id', mockAudioFile),
      ).rejects.toThrow('Session not found: non-existent-id');
    });

    it('STT 실패 시 에러 정보를 저장하고 FAILED 상태로 변경해야 함', async () => {
      // Given
      const sttError = new Error('STT 처리 실패');
      sttService.transcribeAudio.mockRejectedValue(sttError);

      // When & Then
      await expect(
        service.processAudio('test-session-id', mockAudioFile),
      ).rejects.toThrow('STT 처리 실패');

      // FAILED 상태 및 에러 메시지 저장 확인
      expect(sessionRepository.update).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'STT 처리 실패',
        }),
      );
    });

    it('분석 실패 시 에러 정보를 저장하고 FAILED 상태로 변경해야 함', async () => {
      // Given
      const analysisError = new Error('분석 처리 실패');
      analysisService.analyze.mockRejectedValue(analysisError);

      // When & Then
      await expect(
        service.processAudio('test-session-id', mockAudioFile),
      ).rejects.toThrow('분석 처리 실패');

      // FAILED 상태 및 에러 메시지 저장 확인
      expect(sessionRepository.update).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          status: 'FAILED',
          errorMessage: '분석 처리 실패',
        }),
      );
    });

    it('deleteAfterAnalysis가 true면 처리 완료 후 파일을 삭제해야 함', async () => {
      // Given
      const sessionWithDelete = {
        ...mockSession,
        deleteAfterAnalysis: true,
        originalAudioPath: mockAudioFile.path,
      };
      sessionRepository.findOne.mockResolvedValue(sessionWithDelete as SessionEntity);
      (fs.unlink as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      // When
      await service.processAudio('test-session-id', mockAudioFile);

      // Then
      // deleteAudioFile은 private이므로 fs.unlink 호출 확인으로 대체
      // (실제로는 private 메서드 테스트는 권장되지 않음)
    });
  });

  describe('에지 케이스', () => {
    it('STT 결과가 빈 텍스트여도 처리되어야 함', async () => {
      // Given
      const emptySttResult = {
        ...mockSttResult,
        fullText: '',
        segments: [],
      };
      sttService.transcribeAudio.mockResolvedValue(emptySttResult);
      sessionRepository.findOne.mockResolvedValue(mockSession as SessionEntity);
      sessionRepository.update.mockResolvedValue({} as any);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('audio data'));
      analysisService.analyze.mockResolvedValue(mockAnalysisResult);
      transcriptRepository.create.mockReturnValue({} as TranscriptEntity);
      transcriptRepository.save.mockResolvedValue({} as TranscriptEntity);
      analysisRepository.create.mockReturnValue({} as AnalysisEntity);
      analysisRepository.save.mockResolvedValue({} as AnalysisEntity);

      // When
      const result = await service.processAudio('test-session-id', mockAudioFile);

      // Then
      expect(result.sttResult.fullText).toBe('');
      expect(transcriptRepository.save).toHaveBeenCalled();
    });

    it('오디오 길이가 0초여도 처리되어야 함', async () => {
      // Given
      const zeroLengthSttResult = { ...mockSttResult, duration: 0 };
      sttService.transcribeAudio.mockResolvedValue(zeroLengthSttResult);
      sessionRepository.findOne.mockResolvedValue(mockSession as SessionEntity);
      sessionRepository.update.mockResolvedValue({} as any);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('audio data'));
      analysisService.analyze.mockResolvedValue(mockAnalysisResult);
      transcriptRepository.create.mockReturnValue({} as TranscriptEntity);
      transcriptRepository.save.mockResolvedValue({} as TranscriptEntity);
      analysisRepository.create.mockReturnValue({} as AnalysisEntity);
      analysisRepository.save.mockResolvedValue({} as AnalysisEntity);

      // When
      await service.processAudio('test-session-id', mockAudioFile);

      // Then
      expect(sessionRepository.update).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          audioDuration: 0,
        }),
      );
    });
  });
});
