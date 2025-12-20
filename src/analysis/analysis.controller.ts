import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {} // AnalysisService 주입

  @Get('test')
  async test() {
    // 연결 테스트를 위한 임시 엔드포인트
    const result = await this.analysisService.testConnection();
    return {result};
  }
}
