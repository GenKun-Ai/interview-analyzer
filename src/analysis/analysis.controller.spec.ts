import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { ANALYSIS_ENGINE } from 'src/common/constans/injection-tokens';

describe('AnalysisController', () => {
  let controller: AnalysisController;

  beforeEach(async () => {
    const mockAnalysisEngine = {
      analyze: jest.fn(),
      getName: jest.fn(),
    };

    const mockAnalysisService = {
      analyze: jest.fn(),
      getEngineName: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisController],
      providers: [
        { provide: AnalysisService, useValue: mockAnalysisService },
        { provide: ANALYSIS_ENGINE, useValue: mockAnalysisEngine },
      ],
    }).compile();

    controller = module.get<AnalysisController>(AnalysisController);
  });

  it('컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });
});
