import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SessionService } from './session.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from './session.entity';
import { Repository } from 'typeorm';
import { multerConfig } from '../common/config/multer.config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';

@ApiTags('Session')
@Controller('session')
@UseGuards(JwtAuthGuard) // 모든 엔드포인트에 JWT 인증 적용
@ApiBearerAuth() // Swagger에 Bearer 토큰 입력란 표시
export class SessionController {
  private readonly logger = new Logger(SessionController.name);

  constructor(
    private readonly sessionService: SessionService,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectQueue('audio-processing')
    private readonly audioQueue: Queue, // BullMQ 큐 주입
  ) {}

  @Post()
  @ApiOperation({ summary: '새 세션 생성', description: '음성 분석을 위한 새 세션을 생성합니다' })
  @ApiResponse({ status: 201, description: '세션 생성 성공', type: SessionEntity })
  async create(
    @GetUser() user: UserEntity, // 현재 로그인한 유저 정보
    @Body() body: { language: string },
  ) {
    return this.sessionService.create(user, body.language);
  }

  @Get()
  @ApiOperation({ summary: '세션 목록 조회', description: '모든 세션 목록을 최신순으로 조회합니다' })
  @ApiResponse({ status: 200, description: '조회 성공', type: [SessionEntity] })
  async findAll() {
    return this.sessionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '세션 조회', description: 'ID로 세션 상세 정보를 조회합니다' })
  @ApiResponse({ status: 200, description: '조회 성공', type: SessionEntity })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  findOne(@Param('id') id: string) {
    return this.sessionService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '세션 삭제', description: '세션 및 관련 데이터(오디오 파일, 분석 결과)를 삭제합니다' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  async remove(@Param('id') id: string) {
    await this.sessionService.remove(id);
    return { message: '세션이 삭제되었습니다', sessionId: id };
  }

  @Get(':id/audio')
  @ApiOperation({ summary: '오디오 파일 스트리밍', description: '세션의 원본 오디오 파일을 스트리밍합니다 (타임라인 재생용, Range 요청 지원)' })
  @ApiResponse({ status: 200, description: '전체 파일 스트리밍 성공' })
  @ApiResponse({ status: 206, description: 'Partial Content - Range 요청 처리 성공' })
  @ApiResponse({ status: 404, description: '파일을 찾을 수 없음' })
  @ApiResponse({ status: 416, description: 'Range 요청 범위가 유효하지 않음' })
  async streamAudio(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const session = await this.sessionService.findOne(id);

    if (!session || !session.originalAudioPath) {
      return res.status(404).json({ message: '오디오 파일을 찾을 수 없습니다' });
    }

    const fs = require('fs');
    const path = require('path');

    // 파일 존재 여부 확인
    if (!fs.existsSync(session.originalAudioPath)) {
      return res.status(404).json({ message: '파일이 삭제되었거나 존재하지 않습니다' });
    }

    // 파일 정보 조회
    const stat = fs.statSync(session.originalAudioPath);
    const fileSize = stat.size;

    // MIME 타입 설정
    const ext = path.extname(session.originalAudioPath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.webm': 'audio/webm',
      '.flac': 'audio/flac',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    // Range 요청 처리
    const range = req.headers.range;

    if (range) {
      // Range 헤더 파싱: "bytes=start-end"
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // 범위 검증
      if (start >= fileSize || end >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;

      // 206 Partial Content 응답
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', mimeType);

      // 지정된 범위만 스트리밍
      const fileStream = fs.createReadStream(session.originalAudioPath, { start, end });
      fileStream.pipe(res);
    } else {
      // Range 요청이 없으면 전체 파일 스트리밍
      res.status(200);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Accept-Ranges', 'bytes');

      const fileStream = fs.createReadStream(session.originalAudioPath);
      fileStream.pipe(res);
    }
  }

  /**
   * 음성 파일 업로드 (비동기 처리)
   * POST /session/:id/upload
   * 즉시 응답 (2초 이내), 백그라운드에서 처리
   */
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('audio', multerConfig))
  @ApiOperation({
    summary: '음성 파일 업로드 (비동기)',
    description: '음성 파일을 업로드하고 백그라운드에서 STT 및 분석을 수행합니다 (최대 30MB, audio/* 형식만)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '음성 파일 (audio/* 형식)',
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: '업로드 성공, 백그라운드 처리 중',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        sessionId: { type: 'string' },
        jobId: { type: 'string' },
        status: { type: 'string', example: 'QUEUED' },
      }
    }
  })
  @ApiResponse({ status: 400, description: '이미 처리 중이거나 완료된 세션' })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  async uploadAudio(
    @Param('id') sessionId: string,
    @UploadedFile() audioFile: Express.Multer.File,
  ) {
    this.logger.log(`파일 업로드 요청: ${sessionId}`);

    // 1. 세션 존재 및 상태 확인
    const session = await this.sessionService.findOne(sessionId);

    if (!session) {
      // 업로드된 파일 삭제 (정리)
      const fs = require('fs');
      fs.unlinkSync(audioFile.path);
      throw new NotFoundException(`세션을 찾을 수 없습니다: ${sessionId}`);
    }

    // 2. 상태 검증: CREATED 또는 FAILED만 업로드 허용
    const allowedStatuses = ['CREATED', 'FAILED'];
    if (!allowedStatuses.includes(session.status)) {
      // 업로드된 파일 삭제
      const fs = require('fs');
      fs.unlinkSync(audioFile.path);

      throw new BadRequestException(
        `이 세션은 이미 처리 중이거나 완료되었습니다. ` +
        `현재 상태: ${session.status}. ` +
        `새로운 파일을 업로드하려면 새 세션을 생성하세요.`,
      );
    }

    // 3. 파일 메타데이터 즉시 저장
    await this.sessionService.updateSessionMetadata(sessionId, {
      originalAudioPath: audioFile.path,
      status: 'UPLOADING',
    });

    // 4. 백그라운드 작업 큐에 추가
    const job = await this.audioQueue.add('process-audio', {
      sessionId,
      audioFilePath: audioFile.path,
      originalName: audioFile.originalname,
    });

    this.logger.log(`큐에 작업 추가 완료: Job ${job.id}`);

    // 5. 즉시 응답 (2초 이내)
    return {
      message: '파일 업로드 완료. 백그라운드에서 처리 중입니다.',
      sessionId,
      jobId: job.id,
      status: 'QUEUED',
    };
  }

  /**
   * 작업 진행 상황 조회
   * GET /session/:id/job-status
   */
  @Get(':id/job-status')
  @ApiOperation({
    summary: '작업 진행 상황 조회',
    description: '백그라운드에서 처리 중인 작업의 진행 상황을 조회합니다'
  })
  @ApiResponse({
    status: 200,
    description: '진행 상황 조회 성공',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        status: { type: 'string', example: 'TRANSCRIBING' },
        progress: { type: 'number', example: 50 },
        jobId: { type: 'string' },
        jobState: { type: 'string', example: 'active' },
      }
    }
  })
  async getJobStatus(@Param('id') sessionId: string) {
    // 세션 정보 조회
    const session = await this.sessionService.findOne(sessionId);

    if (!session) {
      return {
        sessionId,
        status: 'NOT_FOUND',
        progress: 0,
      };
    }

    // BullMQ 큐에서 작업 찾기
    const jobs = await this.audioQueue.getJobs([
      'active',
      'waiting',
      'delayed',
      'completed',
      'failed',
    ]);

    const job = jobs.find((j) => j.data.sessionId === sessionId);

    if (!job) {
      // 큐에 작업이 없으면 세션 상태 그대로 반환
      return {
        sessionId,
        status: session.status,
        progress: session.status === 'COMPLETED' ? 100 : 0,
      };
    }

    // 작업이 있으면 상세 정보 반환
    const jobState = await job.getState();
    const progress = job.progress as number;

    return {
      sessionId,
      status: session.status,
      progress: progress || 0,
      jobId: job.id,
      jobState, // 'active', 'waiting', 'completed', 'failed' 등
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    };
  }
}
