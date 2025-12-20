import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsString, Max, Min, ValidateNested } from "class-validator";

// ===== Speech Habits DTO =====

export class SilencePeriodDto {
  @ApiProperty({ example: 5.2 })
  @IsNumber()
  startTime: number;

  @ApiProperty({ example: 7.8 })
  @IsNumber()
  endTime: number;

  @ApiProperty({ example: 2.6 })
  @IsNumber()
  duration: number;
}

export class FillerWordOccurrenceDto {
  @ApiProperty({ example: 'あの' })
  @IsString()
  word: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  count: number;

  @ApiProperty({ example: [10.5, 25.3, 42.1] })
  @IsArray()
  @IsNumber({}, { each: true })
  timestamps: number[];
}

export class SpeechHabitsDto {
  @ApiProperty({ type: [SilencePeriodDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SilencePeriodDto)
  silenceDurations: SilencePeriodDto[];

  @ApiProperty({ type: [FillerWordOccurrenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FillerWordOccurrenceDto)
  fillerWords: FillerWordOccurrenceDto[];

  @ApiProperty({ example: 150, description: 'Words per minute' })
  @IsNumber()
  speakingRate: number;

  @ApiProperty({ example: 1.5, description: 'Average pause duration in seconds' })
  @IsNumber()
  averagePauseDuration: number;
}

// ===== Structural Analysis DTOs =====
export class KeywordMathDto {
  @ApiProperty({ example: '技術' })
  @IsString()
  keyword: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  count: number;

  @ApiProperty({ example: [1, 5, 8] })
  @IsArray()
  @IsNumber({}, { each: true })
  segments: number[];

  @ApiProperty({ example: 0.85, description: 'Relevance score (0.0-1.0)'})
  @IsNumber()
  @Min(0)
  @Max(1)
  relevance: number;
}

export class QuestionResponsePairDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  questionSegmentId: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  responseSegmentId: number;

  @ApiProperty({ example: '技術的経験について'})
  @IsString()
  questionIntent: string;

  @ApiProperty({ example: 0.9, description: 'Appropriatencess score (0.0-1.0)'})
  @IsNumber()
  @Min(0)
  @Max(1)
  appropriateness: number;

  @ApiProperty({ example: '具体的な例を挙げて良い答えです' })
  @IsString()
  feeback: string;
}

export class StructuralAnalysisDto {
  @ApiProperty({ type: [QuestionResponsePairDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionResponsePairDto)
  questionResponsePairs: QuestionResponsePairDto[];

  @ApiProperty({ example: 0.85, description: 'Overall appropriateness score (0.0-1.0)'})
  @IsNumber()
  @Min(0)
  @Max(1)
  appropriatenessScore: number;

  @ApiProperty({ type: [KeywordMathDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeywordMathDto)
  keywordMatches: KeywordMathDto[];
}


// Main Analysis Result DTO
export class AnalysisResultDto {
  @ApiProperty({ type: StructuralAnalysisDto })
  @ValidateNested()
  @Type(() => StructuralAnalysisDto)
  structuralAnalysis: StructuralAnalysisDto

  @ApiProperty({ type: SpeechHabitsDto })
  @ValidateNested()
  @Type(() => SpeechHabitsDto)
  speechHabits: SpeechHabitsDto

  @ApiProperty({ example: 85, description: 'Overall Score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number

  @ApiProperty({
    example: [
      '質問に対して具体的に答えています',
      'フィラーワードを減らしましょう',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[]
}

