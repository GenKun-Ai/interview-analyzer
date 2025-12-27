import { Injectable, Inject } from '@nestjs/common';
import type { SttResult } from 'src/common/interfaces/stt-engine.interface';
import type { AnalysisEngine, AnalysisResult } from 'src/common/interfaces/analysis-engine.interface';
import { ANALYSIS_ENGINE } from 'src/common/constans/injection-tokens';

/**
 * 분석 서비스
 * 설정된 분석 엔진을 통해 STT 결과를 분석하여 피드백 생성
 */
@Injectable()
export class AnalysisService {
  constructor(
    @Inject(ANALYSIS_ENGINE) private readonly analysisEngine: AnalysisEngine,
  ) {}

  /**
   * STT 결과를 분석 엔진을 통해 분석
   * @param sttResult - STT 변환 결과 (음성 -> 텍스트)
   * @returns 분석 결과 (점수, 피드백, 습관 분석)
   */
  async analyze(sttResult: SttResult): Promise<AnalysisResult> {
    return await this.analysisEngine.analyze(sttResult);
  }

  /**
   * 현재 사용 중인 분석 엔진 이름 반환
   * @returns 분석 엔진 이름
   */
  getEngineName(): string {
    return this.analysisEngine.getName();
  }
}
