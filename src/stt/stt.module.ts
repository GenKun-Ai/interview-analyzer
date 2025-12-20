import { GoogleSttAdapter } from './adapters/google-stt.adapter';
import { Module } from '@nestjs/common';
import { SttService } from './stt.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SttController } from './stt.controller';
import { OpenAIWhisperAdapter } from './adapters/openai-whisper.adapter';
import { STT_ENGINE } from 'src/common/constans/injection-tokens';

@Module({
  imports: [ConfigModule],
  controllers: [SttController],
  providers: [SttService, OpenAIWhisperAdapter, GoogleSttAdapter, {
    provide: STT_ENGINE,
    useFactory: (config: ConfigService, openai: OpenAIWhisperAdapter, google: GoogleSttAdapter) => {
      const engine = config.get('STT_ENGINE', 'openai');
      return engine === 'google' ? google : openai;
    },
    inject: [ConfigService, OpenAIWhisperAdapter, GoogleSttAdapter],
  }],
  exports: [SttService, STT_ENGINE],
})
export class SttModule {}
