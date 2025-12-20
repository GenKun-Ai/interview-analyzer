import { Injectable, Logger } from '@nestjs/common';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import OpenAI from 'openai';
import { response } from 'express';
import type { SttResult } from 'src/common/interfaces/stt-engine.interface';
import type { AnalysisResult } from 'src/common/interfaces/analysis-engine.interface';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name)
  private openai: OpenAI

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OEPN_API_KEY is not set')
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  /**
   * STT 결과를 분석하여 피드백 생성
   * @param sttResult - STT 변환 결과 (음성 -> 텍스트)
   * @returns 분석 결과 (점수, 피드백, 습관 분석)
   */
  async analyze(sttResult: SttResult): Promise<AnalysisResult> {
    this.logger.log(
      `Analyzing transcript: ${sttResult.language}, ${sttResult.segments.length} segments`,
    )

    // GPT를 사용한 분석
    const prompt = this.buildAnalysisPrompt(sttResult)

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
          content: prompt,  // ← 따옴표 제거 (변수 사용)
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    this.logger.log(`Analysis completed: score ${result.overallScore}`)

    return result as AnalysisResult
  }

  /**
   * GPT에 전달할 분석 프롬프트 생성
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
    })
    this.logger.log(JSON.stringify(response, null, 2))

    return rsp.choices[0].message.content ?? ''
  }
}
