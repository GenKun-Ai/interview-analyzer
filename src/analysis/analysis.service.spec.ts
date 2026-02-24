import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { ANALYSIS_ENGINE } from 'src/common/constans/injection-tokens';
import type { AnalysisEngine, AnalysisResult } from 'src/common/interfaces/analysis-engine.interface';
import type { SttResult } from 'src/common/interfaces/stt-engine.interface';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let analysisEngine: jest.Mocked<AnalysisEngine>;

  const mockSttResult: SttResult = {
    fullText: '안녕하세요 저는 개발자입니다',
    segments: [
      {
        id: 'seg-1',
        text: '안녕하세요',
        startTime: 0,
        endTime: 1.5,
        confidence: 0.95,
      },
    ],
    language: 'ko',
    duration: 3.2,
  };

  const mockAnalysisResult: AnalysisResult = {
    structuralAnalysis: {
      questionResponsePairs: [],
      appropriatenessScore: 0.85,
      keywordMatches: [
        { keyword: '개발자', count: 1, segments: [0], relevance: 0.9 },
      ],
    },
    speechHabits: {
      silenceDurations: [],
      fillerWords: [],
      speakingRate: 120,
      averagePauseDuration: 0.3,
    },
    overallScore: 82,
    recommendations: ['발음을 더 명확히 하세요', '답변 구조를 체계적으로 구성하세요'],
  };

  beforeEach(async () => {
    const mockAnalysisEngine: jest.Mocked<AnalysisEngine> = {
      analyze: jest.fn(),
      getName: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: ANALYSIS_ENGINE, useValue: mockAnalysisEngine },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    analysisEngine = module.get(ANALYSIS_ENGINE);
  });

  afterEach(() => jest.clearAllMocks());

  it('서비스가 정의되어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('analyze', () => {
    it('STT 결과를 분석 엔진에 전달하고 분석 결과를 반환해야 함', async () => {
      // Given
      analysisEngine.analyze.mockResolvedValue(mockAnalysisResult);

      // When
      const result = await service.analyze(mockSttResult);

      // Then
      expect(analysisEngine.analyze).toHaveBeenCalledWith(mockSttResult);
      expect(result).toEqual(mockAnalysisResult);
    });

    it('종합 점수가 0~100 범위여야 함', async () => {
      // Given
      analysisEngine.analyze.mockResolvedValue(mockAnalysisResult);

      // When
      const result = await service.analyze(mockSttResult);

      // Then
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('추천 사항이 배열로 반환되어야 함', async () => {
      // Given
      analysisEngine.analyze.mockResolvedValue(mockAnalysisResult);

      // When
      const result = await service.analyze(mockSttResult);

      // Then
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('분석 엔진 오류 시 에러를 그대로 전파해야 함', async () => {
      // Given
      analysisEngine.analyze.mockRejectedValue(new Error('GPT API 오류'));

      // When & Then
      await expect(service.analyze(mockSttResult)).rejects.toThrow('GPT API 오류');
    });
  });

  describe('getEngineName', () => {
    it('분석 엔진 이름을 반환해야 함', () => {
      // Given
      analysisEngine.getName.mockReturnValue('gpt-4o-mini');

      // When
      const result = service.getEngineName();

      // Then
      expect(analysisEngine.getName).toHaveBeenCalled();
      expect(result).toBe('gpt-4o-mini');
    });
  });
});
