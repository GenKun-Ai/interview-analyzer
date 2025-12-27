import type { SttEngine } from 'src/common/interfaces/stt-engine.interface';
import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';
import { STT_ENGINE } from 'src/common/constans/injection-tokens';

/**
 * 음성-텍스트 변환(STT) 서비스
 * 설정된 STT 엔진을 통해 음성 파일을 텍스트로 변환
 */
@Injectable()
export class SttService {
  constructor(@Inject(STT_ENGINE) private readonly sttEngine: SttEngine) {} // 동적으로 주입받는 STT 엔진 사용함

  // testConnection() {
  //     const apiKey = this.configService.get('OPENAI_API_KEY');
  //     console.log(`API 키 ${apiKey ? '잘 있다' : '잘 없다'}`);
  // }

  /**
   * 오디오 버퍼를 STT 엔진을 통해 텍스트로 변환
   * @param audioBuffer - 변환할 오디오 파일 버퍼
   * @param language - 오디오 언어 (예: 'ko', 'ja', 'en')
   * @param filename - 원본 파일명
   * @returns STT 변환 결과 (텍스트, 세그먼트 등)
   */
  async transcribeAudio(audioBuffer: Buffer, language: string, filename: string) {
    // STT 엔진에 오디오와 옵션 전달하여 변환 실행함
    return await this.sttEngine.transcribe(audioBuffer, {
      language, // 언어 설정
      filename,
      enableSpeakerDiarization: true, // 화자 분리 활성화
      enableWordTimestamps: true, // 단어 타임스탬프 활성화
    })
  }

  /** 현재 설정된 STT 엔진이 지원하는 언어 목록 반환 */
  getSupportedLanguages() {
    return this.sttEngine.getSupportedLanguages(); // 엔진의 지원 언어 목록 반환
  }
}
