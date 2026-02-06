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
          content: this.buildSystemPrompt(),
        },
        {
          role: 'user', // 실제 내용 여청 -> sstResult 기반 분석 프롬프트
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' }, // JSON만 반환
      temperature: 0.7, // 0 = 매우 정확, 1 = 자유로운 창의성
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    this.logger.log(`분석 완료: 점수 ${result.overallScore}`);

    return result as AnalysisResult;
  }

  /**
   * システムプロンプト生成
   * 面接コーチとしての役割・評価基準・出力規約を定義
   */
  private buildSystemPrompt(): string {
    return `あなたは日本語面接の専門コーチです。

## 役割
- 面接練習の音声書き起こしを分析し、構造化されたフィードバックを提供する
- 質問と回答のペアを識別し、各回答の適切性を評価する
- 話し方の癖（フィラーワード、沈黙、話速）を検出する

## 評価基準
- 回答の具体性と論理性（STAR法: Situation, Task, Action, Result）
- 敬語の正確さと適切さ
- フィラーワード（「あの」「えーと」「あー」「うん」「えー」）の頻度
- 沈黙の長さと頻度（3秒以上は長い沈黙と判定）
- 話速の安定性（目安: 日本語は1分あたり300-350文字が適切）

## 採点ロジック (overallScore: 0-100)
- 内容の適切性・具体性: 40点
- 構造と論理性: 20点
- 話し方（速度・沈黙・フィラー）: 25点
- 敬語・言葉遣い: 15点

## 出力規則
- 必ず指定されたJSON形式のみで返答すること
- セグメントIDは入力データのIDをそのまま参照すること
- 数値は適切な範囲内で返すこと（スコア: 0.0-1.0、overallScore: 0-100）
- recommendationsは具体的で実行可能な提案を3-5個含めること`;
  }

  /**
   * GPT에 전달할 분석 프롬프트 생성
   * AnalysisResult 인터페이스와 정확히 매칭되는 JSON 구조를 요청
   * @param sttResult - STT 결과
   * @returns 프롬프트 문자열
   */
  private buildAnalysisPrompt(sttResult: SttResult): string {
    const segmentList = sttResult.segments
      .map(
        (seg) =>
          `  { id: "${seg.id}", startTime: ${seg.startTime}, endTime: ${seg.endTime}, speakerId: "${seg.speakerId || 'unknown'}", text: "${seg.text}" }`,
      )
      .join('\n');

    return `
# 入力データ

言語: ${sttResult.language}
全体の長さ: ${sttResult.duration}秒

## 全文
${sttResult.fullText}

## セグメント一覧
${segmentList}

# 分析タスク

上記の面接練習データを分析し、以下の**正確なJSON構造**で返してください。

\`\`\`json
{
  "structuralAnalysis": {
    "questionResponsePairs": [
      {
        "question": {
          "id": "セグメントID",
          "text": "質問テキスト",
          "startTime": 開始時間(秒),
          "endTime": 終了時間(秒),
          "speakerId": "話者ID",
          "confidence": 1.0
        },
        "response": {
          "id": "セグメントID",
          "text": "回答テキスト",
          "startTime": 開始時間(秒),
          "endTime": 終了時間(秒),
          "speakerId": "話者ID",
          "confidence": 1.0
        },
        "questionIntent": "質問の意図（例: 自己紹介、志望動機、強み）",
        "appropriateness": 0.0から1.0の数値,
        "feedback": "この回答に対する具体的なフィードバック"
      }
    ],
    "appropriatenessScore": 0.0から1.0の全体適切性スコア,
    "keywordMatches": [
      {
        "keyword": "検出されたキーワード",
        "count": 出現回数,
        "segments": [該当セグメントIDの数値配列],
        "relevance": 0.0から1.0の関連度
      }
    ]
  },
  "speechHabits": {
    "silenceDurations": [
      {
        "startTime": 沈黙開始時間(秒),
        "endTime": 沈黙終了時間(秒),
        "duration": 沈黙の長さ(秒)
      }
    ],
    "fillerWords": [
      {
        "word": "フィラーワード",
        "count": 使用回数,
        "timestamps": [発生時刻の配列(秒)]
      }
    ],
    "speakingRate": 1分あたりの文字数,
    "averagePauseDuration": 平均停止時間(秒)
  },
  "overallScore": 0から100の総合点数,
  "recommendations": [
    "具体的かつ実行可能な改善提案"
  ]
}
\`\`\`

## 分析の重点項目
1. 質問と回答のペアを正確に識別し、入力セグメントのIDを参照すること
2. フィラーワード（「あの」「えーと」「あー」「うん」「えー」）を全て検出すること
3. セグメント間の間隔から沈黙区間を推定すること
4. 面接キーワード（コミュニケーション、チームワーク、リーダーシップ等）を検出すること
5. recommendationsは日本語で3-5個、具体的な改善方法を提案すること
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
