import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisEntity } from './entities/analysis.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisEntity])],
  controllers: [AnalysisController], // 컨트롤러 등록
  providers: [AnalysisService], // 서비스 프로바이더 등록
  exports: [AnalysisService], // 다른 모듈에서 사용 가능하도록 export
})
export class AnalysisModule {} // 분석 모듈
