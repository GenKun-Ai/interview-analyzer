import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
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
}
