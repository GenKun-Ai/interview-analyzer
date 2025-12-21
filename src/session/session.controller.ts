import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionService } from './session.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from './session.entity';
import { Repository } from 'typeorm';

@Controller('session')
export class SessionController {
  private readonly logger = new Logger(SessionController.name);

  constructor(
    private readonly sessionService: SessionService,
    @InjectRepository(SessionEntity)
    private readonly sessionRepose: Repository<SessionEntity>,
  ) {}

  @Post()
  async create(@Body() body: { language: string} ) {
    return this.sessionService.create(body.language);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionService.findOne(id);
  }

  /**
   * 음성 파일 업로드 및 처리
   * POST /session/:id/upload
   */
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('audio'))
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
