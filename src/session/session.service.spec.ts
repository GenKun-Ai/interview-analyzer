import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionService } from './session.service';
import { SessionEntity } from './session.entity';
import { TranscriptEntity } from 'src/stt/entities/transcript.entity';
import { AnalysisEntity } from 'src/analysis/entities/analysis.entity';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepository: jest.Mocked<Repository<SessionEntity>>;

  const mockSession: Partial<SessionEntity> = {
    id: 'test-session-id',
    language: 'ko',
    status: 'CREATED',
    description: '테스트 세션',
    deleteAfterAnalysis: false,
  };

  beforeEach(async () => {
    const mockSessionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
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
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(AnalysisEntity),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepository = module.get(getRepositoryToken(SessionEntity));
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
      const mockUserEntity = { id: 'user-id-1', email: 'test@example.com' } as any;
      const language = 'ko';
      sessionRepository.create.mockReturnValue(mockSession as SessionEntity);
      sessionRepository.save.mockResolvedValue(mockSession as SessionEntity);

      // When
      const result = await service.create(mockUserEntity, language);

      // Then
      expect(sessionRepository.create).toHaveBeenCalledWith({ user: mockUserEntity, language });
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

});
