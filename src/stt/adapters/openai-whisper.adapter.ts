import { ConfigService } from '@nestjs/config';
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import OpenAI, { toFile } from "openai";
import {
  SttEngine,
  SttOptions,
  SttResult,
} from 'src/common/interfaces/stt-engine.interface'

/**
 * OpenAI Whisper API 어댑터
 * SttEngine 인터페이스 구현, Whisper API를 통해 음성을 텍스트로 변환
 */
@Injectable()
export class OpenAIWhisperAdapter implements SttEngine {
  private client: OpenAI // OpenAI 클라이언트 인스턴스

  constructor(private configService: ConfigService) {
    // API 키로 클라이언트 초기화함
    this.client = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    })
  }

  getName(): string {
    return 'OpenAI Whisper' // 어댑터 이름 반환함
  }

  getSupportedLanguages(): string[] {
    return ['ko', 'ja'] // 지원 언어 목록 반환함 (ja: 일본어 ISO 639-1 코드)
  }

  /**
   * 오디오 버퍼를 OpenAI Whisper API로 전송, 텍스트 변환
   * @param audioBuffer - 오디오 파일 버퍼
   * @param options - STT 옵션 (언어, 화자 분리 등)
   * @returns 변환된 텍스트 및 상세 정보 포함 SttResult
   *
   * 주의: Node.js 환경에서 Buffer를 File-like 객체로 변환하여 API 호환성 확보
   * (OpenAI SDK 내부적으로 multipart/form-data 전송 시 필요)
   */
  async transcribe(
    audioBuffer: Buffer,
    options?: SttOptions & { filename?: string },
  ): Promise<SttResult> {

    try {
      // 로그 시작 알림
      console.log(`[OpenAI] 파일 처리 중... (size: ${audioBuffer.length})`)
      const startTime = Date.now()

      const originalName = options?.filename || 'audio.mp3'

      // OpenAI SDK는 Buffer를 직접 받을 수 있음 (File 객체 필요 없음)
      // toFile 헬퍼를 사용하여 File-like 객체 생성
      // Node.js 환경 : Buffer를 File-like 객체로 변환
      const file = await toFile(audioBuffer, originalName, {
        type: 'application/octet-stream', // MIME 타입 지정함
        lastModified: Date.now(), // 최종 수정 시간 기록함
      })

      // Whisper API 호출하여 음성 텍스트로 변환함
      const transcription = await this.client.audio.transcriptions.create({
        file: file,
        model: 'whisper-1', // Whisper 모델 사용함
        language: options?.language, // 요청 언어 설정함
        response_format: 'verbose_json', // 상세 JSON 응답 요청함
        timestamp_granularities: ['word', 'segment'], // 단어, 세그먼트 타임스탬프 포함함
      })

      // 로그 추가
      const duration = (Date.now() - startTime) / 1000
      console.log(`[OpenAI] 변환 완료! took ${duration}`)

      return this.transformToSttResult(transcription) // 결과 변환 후 반환함
    } catch(error) {
      console.error('OPENAI error', error);
      throw new InternalServerErrorException(`OpenAI STT Failed: ${error.message}`)
  }
}

  /**
   * OpenAI Whisper API 응답을 표준 SttResult 형식으로 변환
   * - 세그먼트, 단어별 타임스탬프, 화자 정보 등 파싱 및 매핑
   * @param response - OpenAI Whisper API의 원본 응답
   * @returns 정규화된 SttResult 객체
   */
  private transformToSttResult(response: any): SttResult {
    // OpenAI Whisper API 응답을 표준 SttResult로 변환함
    const segments = response.segments?.map((seg: any, idx: number) => ({
      id: String(idx + 1),  // string으로 변환함
      startTime: seg.start, // 시작 시간
      endTime: seg.end, // 종료 시간
      text: seg.text.trim(), // 텍스트 내용
      speakerId: 'Speaker_A', // Whisper는 기본적으로 화자 분리 미지원함, 기본값 사용함
      confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.9, // 신뢰도 계산함
      words: seg.words?.map((word: any) => ({
        text: word.word.trim(), // 단어 텍스트
        startTime: word.start, // 단어 시작 시간
        endTime: word.end, // 단어 종료 시간
        confidence: word.probability || 0.9, // 단어 신뢰도
      })),
    })) || [];

    return {
      fullText: response.text || '', // 전체 텍스트
      segments, // 세그먼트 목록
      language: response.language || 'unknown', // 언어
      duration: response.duration || 0, // 오디오 길이
    };
  }
}