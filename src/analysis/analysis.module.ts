import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';

@Module({
  controllers: [AnalysisController], // 컨트롤러 등록
  providers: [AnalysisService], // 서비스 프로바이더 등록
})
export class AnalysisModule {} // 분석 모듈
