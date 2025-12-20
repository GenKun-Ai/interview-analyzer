import { Injectable, Logger } from '@nestjs/common';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import OpenAI from 'openai';
import { response } from 'express';
import type { SttResult } from 'src/common/interfaces/stt-engine.interface';
import type { AnalysisResult } from 'src/common/interfaces/analysis-engine.interface';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name); // 로거 인스턴스
  private openai: OpenAI; // OpenAI 클라이언트

  constructor() {
    // API 키 없으면 에러 발생시킴
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OEPN_API_KEY is not set');
    }

    // OpenAI 클라이언트 초기화
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * STT 결과를 분석하여 피드백 생성
   * @param sttResult - STT 변환 결과 (음성 -> 텍스트)
   * @returns 분석 결과 (점수, 피드백, 습관 분석)
   */
  async analyze(sttResult: SttResult): Promise<AnalysisResult> {
    this.logger.log(
      `Analyzing transcript: ${sttResult.language}, ${sttResult.segments.length} segments`,
    ); // 분석 시작 로깅

    // GPT를 사용한 분석
    const prompt = this.buildAnalysisPrompt(sttResult); // 프롬프트 생성

    // OpenAI API 호출
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini', // 사용할 모델
      messages: [
        {
          role: 'system',
          content: `あなたは日本語の面接コーチです。
          会話内容と練習を分析し、構造化されたフィードバックを提供します。
          必ず以下のJSON形式で返答してください。`, // 시스템 메시지 (역할 부여)
        },
        {
          role: 'user',
          content: prompt,  // 사용자 메시지 (프롬프트 전달)
        },
      ],
      response_format: { type: 'json_object' }, // 응답 형식은 JSON으로 지정
      temperature: 0.7, // 다양성 조절
    });

    const result = JSON.parse(response.choices[0].message.content || '{}'); // 결과 파싱
    this.logger.log(`Analysis completed: score ${result.overallScore}`); // 분석 완료 로깅

    return result as AnalysisResult; // 결과 반환
  }

  /**
   * GPT에 전달할 분석 프롬프트 생성
   */
  private buildAnalysisPrompt(sttResult: SttResult): string {
      // 프롬프트 템플릿에 STT 결과 삽입
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

  async testConnection(): Promise<string> {
    // 연결 테스트용 메서드
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
    this.logger.log(JSON.stringify(response, null, 2)); // 응답 로깅

    return rsp.choices[0].message.content ?? ''; // 응답 내용 반환
  }
}
