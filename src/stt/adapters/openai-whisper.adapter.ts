import { ConfigService } from '@nestjs/config';
import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import {
  SttEngine,
  SttOptions,
  SttResult,
} from 'src/common/interfaces/stt-engine.interface'

@Injectable()
export class OpenAIWhisperAdapter implements SttEngine {
  private client: OpenAI

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    })
  }

  getName(): string {
    return 'OpenAI Whisper'
  }

  getSupportedLanguages(): string[] {
    return ['ko', 'jp']
  }

  async transcribe(
    audioBuffer: Buffer,
    options?: SttOptions,
  ): Promise<SttResult> {
    // OpenAI SDK는 Buffer를 직접 받을 수 있음 (File 객체 필요 없음)
    // toFile 헬퍼를 사용하여 File-like 객체 생성
    const file = await (async () => {
      // Node.js 환경 : Buffer를 File-like 객체로 변환
      return Object.assign(audioBuffer, {
        name: 'audio.mp3',
        type: 'audio/mpeg',
        lastModified: Date.now(),
      })
    })

    const transcription = await this.client.audio.transcriptions.create({
      file: file as any, // TypeScript 타입 우회
      model: 'whisper-1',
      language: options?.language,
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment'],
    })

    return this.transformToSttResult(transcription)
  }

  private transformToSttResult(response: any): SttResult {
    // OpenAI Whisper API 응답을 표준 SttResult로 변환
    const segments = response.segments?.map((seg: any, idx: number) => ({
      id: String(idx + 1),  // string으로 변환
      startTime: seg.start,
      endTime: seg.end,
      text: seg.text.trim(),
      speakerId: 'Speaker_A', // Whisper는 기본적으로 화자 분리 미지원
      confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.9,
      words: seg.words?.map((word: any) => ({
        text: word.word.trim(),
        startTime: word.start,
        endTime: word.end,
        confidence: word.probability || 0.9,
      })),
    })) || [];

    return {
      fullText: response.text || '',
      segments,
      language: response.language || 'unknown',
      duration: response.duration || 0,
    };
  }
}