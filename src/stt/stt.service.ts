import type { SttEngine } from 'src/common/interfaces/stt-engine.interface';
import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';
import { STT_ENGINE } from 'src/common/constans/injection-tokens';

@Injectable()
export class SttService {
  constructor(@Inject(STT_ENGINE) private readonly sttEngine: SttEngine) {}

  // testConnection() {
  //     const apiKey = this.configService.get('OPENAI_API_KEY');
  //     console.log(`API 키 ${apiKey ? '잘 있다' : '잘 없다'}`);
  // }

  async transcribeAudio(audioBuffer: Buffer, language: string) {
    console.log(`Using STT Engine ${this.sttEngine}`)

    return await this.sttEngine.transcribe(audioBuffer, {
      language,
      enableSpeakerDiarization: true,
      enableWordTimestamps: true,
    })
  }

  getSupportedLanguages() {
    return this.sttEngine.getSupportedLanguages();
  }
}
