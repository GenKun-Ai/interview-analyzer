import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsString, Max, Min, ValidateNested } from "class-validator";

// ===== Speech Habits DTO =====

export class SilencePeriodDto {
  @ApiProperty({ example: 5.2 })
  @IsNumber()
  startTime: number; // 침묵 시작 시간

  @ApiProperty({ example: 7.8 })
  @IsNumber()
  endTime: number; // 침묵 종료 시간

  @ApiProperty({ example: 2.6 })
  @IsNumber()
  duration: number; // 침묵 지속 시간
}

export class FillerWordOccurrenceDto {
  @ApiProperty({ example: 'あの' })
  @IsString()
  word: string; // 필러 워드 내용

  @ApiProperty({ example: 5 })
  @IsNumber()
  count: number; // 필러 워드 출현 횟수

  @ApiProperty({ example: [10.5, 25.3, 42.1] })
  @IsArray()
  @IsNumber({}, { each: true })
  timestamps: number[]; // 필러 워드 출현 시간 목록
}

export class SpeechHabitsDto {
  @ApiProperty({ type: [SilencePeriodDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SilencePeriodDto)
  silenceDurations: SilencePeriodDto[]; // 모든 침묵 구간

  @ApiProperty({ type: [FillerWordOccurrenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FillerWordOccurrenceDto)
  fillerWords: FillerWordOccurrenceDto[]; // 모든 필러 워드 정보

  @ApiProperty({ example: 150, description: 'Words per minute' })
  @IsNumber()
  speakingRate: number; // 분당 단어 수 (WPM)

  @ApiProperty({ example: 1.5, description: 'Average pause duration in seconds' })
  @IsNumber()
  averagePauseDuration: number; // 평균 멈춤 시간
}

// ===== Structural Analysis DTOs =====
export class KeywordMathDto {
  @ApiProperty({ example: '技術' })
  @IsString()
  keyword: string; // 키워드 내용

  @ApiProperty({ example: 3 })
  @IsNumber()
  count: number; // 키워드 출현 횟수

  @ApiProperty({ example: [1, 5, 8] })
  @IsArray()
  @IsNumber({}, { each: true })
  segments: number[]; // 키워드가 나타난 세그먼트 ID 목록

  @ApiProperty({ example: 0.85, description: 'Relevance score (0.0-1.0)'})
  @IsNumber()
  @Min(0)
  @Max(1)
  relevance: number; // 질문과의 연관도
}

export class QuestionResponsePairDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  questionSegmentId: number; // 질문 세그먼트 ID

  @ApiProperty({ example: 2 })
  @IsNumber()
  responseSegmentId: number; // 응답 세그먼트 ID

  @ApiProperty({ example: '技術的経験について'})
  @IsString()
  questionIntent: string; // 질문 의도

  @ApiProperty({ example: 0.9, description: 'Appropriatencess score (0.0-1.0)'})
  @IsNumber()
  @Min(0)
  @Max(1)
  appropriateness: number; // 응답의 적절성 점수

  @ApiProperty({ example: '具体的な例を挙げて良い答えです' })
  @IsString()
  feeback: string; // 응답에 대한 피드백
}

export class StructuralAnalysisDto {
  @ApiProperty({ type: [QuestionResponsePairDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionResponsePairDto)
  questionResponsePairs: QuestionResponsePairDto[]; // 질문-응답 쌍 목록

  @ApiProperty({ example: 0.85, description: 'Overall appropriateness score (0.0-1.0)'})
  @IsNumber()
  @Min(0)
  @Max(1)
  appropriatenessScore: number; // 전체 적절성 점수

  @ApiProperty({ type: [KeywordMathDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeywordMathDto)
  keywordMatches: KeywordMathDto[]; // 키워드 매칭 결과 목록
}


// Main Analysis Result DTO
export class AnalysisResultDto {
  @ApiProperty({ type: StructuralAnalysisDto })
  @ValidateNested()
  @Type(() => StructuralAnalysisDto)
  structuralAnalysis: StructuralAnalysisDto; // 구조적 분석 결과

  @ApiProperty({ type: SpeechHabitsDto })
  @ValidateNested()
  @Type(() => SpeechHabitsDto)
  speechHabits: SpeechHabitsDto; // 말하기 습관 분석 결과

  @ApiProperty({ example: 85, description: 'Overall Score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number; // 전체 점수 (0-100)

  @ApiProperty({
    example: [
      '質問に対して具体的に答えています',
      'フィラーワードを減らしましょう',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[]; // 개선을 위한 추천 사항 목록
}

