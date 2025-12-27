import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { SttResult } from 'src/common/interfaces/stt-engine.interface';
import type { AnalysisEngine, AnalysisResult } from 'src/common/interfaces/analysis-engine.interface';

/**
 * OpenAI GPT 기반 분석 엔진 어댑터
 * AnalysisEngine 인터페이스 구현, GPT-4를 통해 STT 결과를 분석
 */
@Injectable()
export class GptAnalysisAdapter implements AnalysisEngine {
  private readonly logger = new Logger(GptAnalysisAdapter.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    // API 키 검증
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // OpenAI 클라이언트 초기화
    this.openai = new OpenAI({ apiKey });
  }

  getName(): string {
    return 'GPT-4o-mini Analysis Engine';
  }

  /**
   * STT 결과를 GPT를 통해 분석하여 피드백 생성
   * @param sttResult - STT 변환 결과 (음성 -> 텍스트)
   * @returns 분석 결과 (점수, 피드백, 습관 분석)
   */
  async analyze(sttResult: SttResult): Promise<AnalysisResult> {
    this.logger.log(
      `분석 시작: ${sttResult.language}, 세그먼트 ${sttResult.segments.length}개`,
    );

    // GPT 분석 프롬프트 생성
    const prompt = this.buildAnalysisPrompt(sttResult);

    // OpenAI API 호출
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは日本語の面接コーチです。
          会話内容と練習を分析し、構造化されたフィードバックを提供します。
          必ず以下のJSON形式で返答してください。`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    this.logger.log(`분석 완료: 점수 ${result.overallScore}`);

    return result as AnalysisResult;
  }

  /**
   * GPT에 전달할 분석 프롬프트 생성
   * @param sttResult - STT 결과
   * @returns 프롬프트 문자열
   */
  private buildAnalysisPrompt(sttResult: SttResult): string {
    return `
# 発話内容

全文: ${sttResult.fullText}

タイムライン:
${sttResult.segments.map(seg => `[${seg.startTime}s - ${seg.endTime}s]
${seg.speakerId}: ${seg.text}`).join('\n')}

# 分析タスク

以下のJSON形式で分析結果を返してください:

\`\`\`json
{
  "structuralAnalysis": {
    "questionResponsePairs": [],
    "appropriatenessScore": 0.0-1.0の数値,
    "keywordMatches": []
  },
  "speechHabits": {
    "silenceDurations": [],
    "fillerWords": [
      { "word": "あの", "count": 回数, "timestamps": [発生時刻] }
    ],
    "speakingRate": 分あたりの単語数,
    "averagePauseDuration": 平均停止時間(秒)
  },
  "overallScore": 0-100の総合点数,
  "recommendations": [
    "具体的な改善提案1",
    "具体的な改善提案2"
  ]
}
\`\`\`

特に以下を重点的に分析してください:
1. フィラーワード(「あの」「えーと」「あー」「うん」)の検出
2. 発話速度と停止時間の分析
3. 内容の適切性と具体性
4. 改善のための具体的な提案
`;
  }

  /**
   * API 연결 테스트용 메서드
   * @returns 테스트 응답 메시지
   */
  async testConnection(): Promise<string> {
    const rsp = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'you are an interview analyzer.',
        },
        {
          role: 'user',
          content: '이 문장을 한 줄로 요약해줘',
        },
      ],
    });

    this.logger.log(`테스트 연결 성공: ${rsp.choices[0].message.content}`);
    return rsp.choices[0].message.content ?? '';
  }
}
