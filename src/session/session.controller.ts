import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionService } from './session.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from './session.entity';
import { Repository } from 'typeorm';
import { multerConfig } from '../common/config/multer.config';

@ApiTags('세션 관리')
@Controller('session')
export class SessionController {
  private readonly logger = new Logger(SessionController.name);

  constructor(
    private readonly sessionService: SessionService,
    @InjectRepository(SessionEntity)
    private readonly sessionRepose: Repository<SessionEntity>,
  ) {}

  @Post()
  @ApiOperation({ summary: '새 세션 생성', description: '음성 분석을 위한 새 세션을 생성합니다' })
  @ApiResponse({ status: 201, description: '세션 생성 성공', type: SessionEntity })
  async create(@Body() body: { language: string} ) {
    return this.sessionService.create(body.language);
  }

  @Get(':id')
  @ApiOperation({ summary: '세션 조회', description: 'ID로 세션 상세 정보를 조회합니다' })
  @ApiResponse({ status: 200, description: '조회 성공', type: SessionEntity })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  findOne(@Param('id') id: string) {
    return this.sessionService.findOne(id);
  }

  @Get(':id/audio')
  @ApiOperation({ summary: '오디오 파일 스트리밍', description: '세션의 원본 오디오 파일을 스트리밍합니다 (타임라인 재생용)' })
  @ApiResponse({ status: 200, description: '오디오 파일 스트리밍 성공' })
  @ApiResponse({ status: 404, description: '파일을 찾을 수 없음' })
  async streamAudio(@Param('id') id: string, @Res() res: Response) {
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

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes'); // 재생 위치 탐색 지원

    // 파일 스트리밍
    const fileStream = fs.createReadStream(session.originalAudioPath);
    fileStream.pipe(res);
  }

  /**
   * 음성 파일 업로드 및 처리
   * POST /session/:id/upload
   */
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('audio', multerConfig))
  @ApiOperation({ summary: '음성 파일 업로드', description: '음성 파일을 업로드하여 STT 및 분석을 수행합니다 (최대 30MB, audio/* 형식만)' })
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
  @ApiResponse({ status: 200, description: '처리 성공', schema: {
    type: 'object',
    properties: {
      sttResult: { type: 'object' },
      analysisResult: { type: 'object' }
    }
  }})
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '처리 실패 (에러 메시지는 세션의 errorMessage 필드에 저장됨)' })
  async uploadAudio(
    @Param('id') sessionId: string,
    @UploadedFile() audioFile: Express.Multer.File,
  ) {
    this.logger.log(`Processing audio for session ${sessionId}`);
    return this.sessionService.processAudio(sessionId, audioFile);
  }
  
  // 백그라운드에서 처리 비동기 처리 작업 TODO
  // @Process('process-audio')
  // async handleAudioProcessing(job) {
  // await this.sessionService.processAudio()
  //} 
}
