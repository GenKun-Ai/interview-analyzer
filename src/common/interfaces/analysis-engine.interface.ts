// analysis-engine.interface.ts

import { TranscriptSegment, SttResult } from './stt-engine.interface'


export interface AnalysisResult {
  structuralAnalysis: StructuralAnalysis
  speechHabits: SpeechHabits
  overallScore: number
  recommendations: string[]
}

export interface StructuralAnalysis {
  questionResponsePairs: QuestionResponsePair[]
  appropriatenessScore: number
  keywordMatches: KeywordMatch[]
}

export interface QuestionResponsePair {
  question: TranscriptSegment
  response: TranscriptSegment
  questionIntent: string
  appropriateness: number
  feedback: string
}

// 키워드 매칭 결과 (면접 답변의 핵심 키워드 분석용)
export interface KeywordMatch {
  keyword: string     // "コミュニケーション", "チームワーク"
  count: number       // 몇 번 언급했는지
  segments: number[]  // 어느 세그먼트에서 나왔는지
  relevance: number   // 질문과의 연관도 (0.0~1.0)
}

// 침묵 구간 정보 (너무 긴 pause는 감점 요소)
export interface SilencePeriod {
    startTime: number  // 침묵 시작 시간 (초)
    endTime: number    // 침묵 종료 시간 (초)
    duration: number   // 침묵 지속 시간 (초)
}

// 필러워드 발생 정보 (군더더기 말 - "아", "음", "그", "저기")
export interface FillerWordOccurrence {
    word: string            // ”あの”、”えと”、”あー”、”うん”
    count: number           // 총 몇 번 사용했는지
    timestamps: number[]    // 각각 몇 초에 나왔는지 [12.5, 34.2, 56.8]
}

// 전체 말버릇 분석 결과
export interface SpeechHabits {
  silenceDurations: SilencePeriod[]   // 모든 침묵 구간
  fillerWords: FillerWordOccurrence[] // 모든 필러 워드
  speakingRate: number                // 분당 단어 수 
  averagePauseDuration: number        // 평균 멈춤 시간
}

export interface AnalysisEngine {
  analyze(sttResult: SttResult): Promise<AnalysisResult>
  getName(): string
}
