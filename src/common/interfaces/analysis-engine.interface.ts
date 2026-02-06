// analysis-engine.interface.ts

import { TranscriptSegment, SttResult } from './stt-engine.interface'


// 분석 결과 타입
export interface AnalysisResult {
  structuralAnalysis: StructuralAnalysis // 구조적 분석 결과 (질문-응답 분석)
  speechHabits: SpeechHabits // 말하기 습관 분석 결과
  overallScore: number // 전체 점수 (0~100)
  recommendations: string[] // 개선을 위한 추천 사항 목록
}

export interface StructuralAnalysis {
  questionResponsePairs: QuestionResponsePair[] // 질문-응답 쌍 목록
  appropriatenessScore: number // 적절성 점수
  keywordMatches: KeywordMatch[] // 키워드 매칭 결과 목록
}

export interface QuestionResponsePair {
  question: TranscriptSegment // 질문 세그먼트
  response: TranscriptSegment // 응답 세그먼트
  questionIntent: string // 질문 의도
  appropriateness: number // 응답의 적절성 점수
  feedback: string // 응답에 대한 피드백
}

// 키워드 매칭 결과 (면접 답변의 핵심 키워드 분석용)
export interface KeywordMatch {
  keyword: string     // 키워드 내용 (예: "コミュニケーション", "チームワーク")
  count: number       // 키워드 언급 횟수
  segments: number[]  // 키워드가 나타난 세그먼트 ID 목록
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
    word: string            // 필러 워드 내용 (예: ”あの”、”えと”、”あー”、”うん”)
    count: number           // 총 사용 횟수
    timestamps: number[]    // 발생 시간 (초) 목록 (예: [12.5, 34.2, 56.8])
}

// 전체 말버릇 분석 결과
export interface SpeechHabits {
  silenceDurations: SilencePeriod[]   // 모든 침묵 구간 정보
  fillerWords: FillerWordOccurrence[] // 모든 필러 워드 정보
  speakingRate: number                // 분당 단어 수
  averagePauseDuration: number        // 평균 멈춤 시간
}

// 분석 엔진 계약
export interface AnalysisEngine {
  analyze(sttResult: SttResult): Promise<AnalysisResult> // STT 결과를 분석하여 분석 결과를 반환함
  getName(): string // 엔진 이름 반환함
}
