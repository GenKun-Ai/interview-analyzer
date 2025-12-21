import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from './session.entity';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { SttModule } from 'src/stt/stt.module';
import { AnalysisModule } from 'src/analysis/analysis.module';
import { TranscriptEntity } from 'src/stt/entities/transcript.entity';
import { AnalysisEntity } from 'src/analysis/entities/analysis.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity, TranscriptEntity, AnalysisEntity]),
    AnalysisModule,
    forwardRef(() => SttModule),
  ],
  providers: [SessionService],
  controllers: [SessionController],
})
export class SessionModule {}
