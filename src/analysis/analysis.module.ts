import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { AnalysisEntity } from './entities/analysis.entity';
import { GptAnalysisAdapter } from './adapters/gpt-analysis.adapter';
import { ANALYSIS_ENGINE } from 'src/common/constans/injection-tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalysisEntity]),
    ConfigModule, // ConfigService 사용 위해 필요
  ],
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    // 분석 엔진 동적 주입
    {
      provide: ANALYSIS_ENGINE,
      useClass: GptAnalysisAdapter, // 기본: GPT 기반 분석
    },
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
