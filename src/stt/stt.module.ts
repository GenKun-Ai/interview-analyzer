import { Module } from '@nestjs/common';
import { SttService } from './stt.service';
import { ConfigModule } from '@nestjs/config';
import { SttController } from './stt.controller';
import { OpenAIWhisperAdapter } from './adapters/openai-whisper.adapter';
import { STT_ENGINE } from 'src/common/constans/injection-tokens';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranscriptEntity } from './entities/transcript.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([TranscriptEntity]),
  ],
  controllers: [SttController],
  providers: [
    SttService,
    OpenAIWhisperAdapter,
    {
      provide: STT_ENGINE,
      useExisting: OpenAIWhisperAdapter,
    },
  ],
  exports: [SttService, STT_ENGINE],
})
export class SttModule {}
