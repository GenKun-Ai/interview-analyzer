import { GoogleSttAdapter } from './adapters/google-stt.adapter';
import { Module } from '@nestjs/common';
import { SttService } from './stt.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SttController } from './stt.controller';
import { OpenAIWhisperAdapter } from './adapters/openai-whisper.adapter';
import { STT_ENGINE } from 'src/common/constans/injection-tokens';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranscriptEntity } from './entities/transcript.entity';

@Module({
  imports: [
    ConfigModule, // 설정 모듈 임포트
    TypeOrmModule.forFeature([TranscriptEntity]),
  ],
  controllers: [SttController], // 컨트롤러 등록
  providers: [
    SttService,
    OpenAIWhisperAdapter, // 어댑터 1
    GoogleSttAdapter,     // 어댑터 2
    {
      provide: STT_ENGINE, // STT_ENGINE 토큰 제공
      // 팩토리 함수를 사용하여 동적(환경변수)으로 STT 엔진 선택
      useFactory: (config: ConfigService, openai: OpenAIWhisperAdapter, google: GoogleSttAdapter) => {
        const engine = config.get('STT_ENGINE', 'openai'); // 환경변수에서 엔진 이름 가져옴
        return engine === 'google' ? google : openai; // 'google'이면 Google, 아니면 OpenAI 어댑터 사용
      },
      inject: [ConfigService, OpenAIWhisperAdapter, GoogleSttAdapter], // 의존성 주입
    },
  ],
  exports: [SttService, STT_ENGINE], // 다른 모듈에서 사용할 수 있도록 서비스와 토큰을 export
})
export class SttModule {} // STT 모듈
