import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionEntity } from './session.entity';
import { UserEntity } from 'src/users/entities/user.entity';

describe('SessionController', () => {
  let controller: SessionController;
  let sessionService: jest.Mocked<SessionService>;

  const mockUser: Partial<UserEntity> = {
    id: 'user-id-1',
    email: 'test@example.com',
    name: '테스트 유저',
  };

  const mockSession: Partial<SessionEntity> = {
    id: 'session-id-1',
    language: 'ko',
    status: 'CREATED',
    description: '테스트 세션',
    deleteAfterAnalysis: false,
  };

  const mockQueue = {
    add: jest.fn(),
    getJobs: jest.fn(),
  };

  const mockSessionRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const mockSessionService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      updateSessionMetadata: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        { provide: SessionService, useValue: mockSessionService },
        { provide: getRepositoryToken(SessionEntity), useValue: mockSessionRepository },
        { provide: getQueueToken('audio-processing'), useValue: mockQueue },
      ],
    }).compile();

    controller = module.get<SessionController>(SessionController);
    sessionService = module.get(SessionService);
  });

  afterEach(() => jest.clearAllMocks());

  it('컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('새 세션을 생성하고 반환해야 함', async () => {
      // Given
      sessionService.create.mockResolvedValue(mockSession as SessionEntity);

      // When
      const result = await controller.create(
        mockUser as UserEntity,
        { language: 'ko' },
      );

      // Then
      expect(sessionService.create).toHaveBeenCalledWith(mockUser, 'ko');
      expect(result).toEqual(mockSession);
    });
  });

  describe('findAll', () => {
    it('현재 유저의 세션 목록을 반환해야 함', async () => {
      // Given
      sessionService.findAll.mockResolvedValue([mockSession as SessionEntity]);

      // When
      const result = await controller.findAll(mockUser as UserEntity);

      // Then
      expect(sessionService.findAll).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual([mockSession]);
    });
  });

  describe('findOne', () => {
    it('세션 ID로 세션을 조회해야 함', async () => {
      // Given
      sessionService.findOne.mockResolvedValue(mockSession as SessionEntity);

      // When
      const result = await controller.findOne(mockUser as UserEntity, 'session-id-1');

      // Then
      expect(sessionService.findOne).toHaveBeenCalledWith('session-id-1', mockUser.id);
      expect(result).toEqual(mockSession);
    });

    it('세션이 없으면 NotFoundException을 던져야 함', async () => {
      // Given
      sessionService.findOne.mockResolvedValue(null);

      // When & Then
      await expect(
        controller.findOne(mockUser as UserEntity, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('세션을 삭제하고 완료 메시지를 반환해야 함', async () => {
      // Given
      sessionService.remove.mockResolvedValue(undefined);

      // When
      const result = await controller.remove(mockUser as UserEntity, 'session-id-1');

      // Then
      expect(sessionService.remove).toHaveBeenCalledWith('session-id-1', mockUser.id);
      expect(result).toEqual({
        message: '세션이 삭제되었습니다',
        sessionId: 'session-id-1',
      });
    });
  });

  describe('uploadAudio', () => {
    const mockAudioFile = {
      fieldname: 'audio',
      originalname: 'interview.mp3',
      mimetype: 'audio/mpeg',
      size: 1024000,
      path: './uploads/session-id-1/interview.mp3',
    } as Express.Multer.File;

    it('CREATED 상태 세션에 오디오를 업로드하고 jobId를 반환해야 함', async () => {
      // Given
      sessionService.findOne.mockResolvedValue(mockSession as SessionEntity);
      sessionService.updateSessionMetadata.mockResolvedValue(undefined);
      mockQueue.add.mockResolvedValue({ id: 'job-id-1' });

      // When
      const result = await controller.uploadAudio(
        mockUser as UserEntity,
        'session-id-1',
        mockAudioFile,
      );

      // Then
      expect(sessionService.findOne).toHaveBeenCalledWith('session-id-1', mockUser.id);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-audio',
        expect.objectContaining({ sessionId: 'session-id-1' }),
      );
      expect(result).toEqual(
        expect.objectContaining({ jobId: 'job-id-1', status: 'QUEUED' }),
      );
    });

    it('세션이 없으면 NotFoundException을 던져야 함', async () => {
      // Given
      const fs = require('fs');
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
      sessionService.findOne.mockResolvedValue(null);

      // When & Then
      await expect(
        controller.uploadAudio(mockUser as UserEntity, 'non-existent-id', mockAudioFile),
      ).rejects.toThrow(NotFoundException);
    });

    it('이미 처리 중인 세션(TRANSCRIBING)에 업로드하면 BadRequestException을 던져야 함', async () => {
      // Given
      const fs = require('fs');
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
      const processingSession = { ...mockSession, status: 'TRANSCRIBING' };
      sessionService.findOne.mockResolvedValue(processingSession as SessionEntity);

      // When & Then
      await expect(
        controller.uploadAudio(mockUser as UserEntity, 'session-id-1', mockAudioFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('완료된 세션(COMPLETED)에 업로드하면 BadRequestException을 던져야 함', async () => {
      // Given
      const fs = require('fs');
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
      const completedSession = { ...mockSession, status: 'COMPLETED' };
      sessionService.findOne.mockResolvedValue(completedSession as SessionEntity);

      // When & Then
      await expect(
        controller.uploadAudio(mockUser as UserEntity, 'session-id-1', mockAudioFile),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getJobStatus', () => {
    it('세션이 없으면 NOT_FOUND 상태를 반환해야 함', async () => {
      // Given
      sessionService.findOne.mockResolvedValue(null);

      // When
      const result = await controller.getJobStatus(mockUser as UserEntity, 'non-existent-id');

      // Then
      expect(result).toEqual(
        expect.objectContaining({ status: 'NOT_FOUND', progress: 0 }),
      );
    });

    it('큐에 잡이 없으면 세션 상태를 그대로 반환해야 함', async () => {
      // Given
      sessionService.findOne.mockResolvedValue(mockSession as SessionEntity);
      mockQueue.getJobs.mockResolvedValue([]); // 큐에 잡 없음

      // When
      const result = await controller.getJobStatus(mockUser as UserEntity, 'session-id-1');

      // Then
      expect(result).toEqual(
        expect.objectContaining({ status: 'CREATED', sessionId: 'session-id-1' }),
      );
    });

    it('COMPLETED 세션에 잡이 없으면 progress 100을 반환해야 함', async () => {
      // Given
      const completedSession = { ...mockSession, status: 'COMPLETED' };
      sessionService.findOne.mockResolvedValue(completedSession as SessionEntity);
      mockQueue.getJobs.mockResolvedValue([]);

      // When
      const result = await controller.getJobStatus(mockUser as UserEntity, 'session-id-1');

      // Then
      expect(result).toEqual(
        expect.objectContaining({ progress: 100 }),
      );
    });
  });
});
