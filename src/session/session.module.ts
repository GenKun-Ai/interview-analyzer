import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SessionEntity } from './session.entity';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { SttModule } from 'src/stt/stt.module';
import { AnalysisModule } from 'src/analysis/analysis.module';
import { TranscriptEntity } from 'src/stt/entities/transcript.entity';
import { AnalysisEntity } from 'src/analysis/entities/analysis.entity';
import { AudioProcessingProcessor } from './processors/audio-processing.processor';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity, TranscriptEntity, AnalysisEntity]),
    // BullMQ 큐 등록
    BullModule.registerQueue({
      name: 'audio-processing', // 큐 이름
      defaultJobOptions: {
        attempts: 3, // 실패 시 재시도 3회
        backoff: {
          type: 'exponential', // 지수 백오프
          delay: 5000, // 5초부터 시작
        },
        removeOnComplete: {
          age: 3600, // 완료 후 1시간 보관
          count: 100, // 최근 100개만 보관
        },
        removeOnFail: false, // 실패 작업은 보관 (디버깅)
      },
    }),
    AnalysisModule,
    forwardRef(() => SttModule),
    UsersModule, // JWT 인증 및 UserRepository 사용
  ],
  providers: [SessionService, AudioProcessingProcessor],
  controllers: [SessionController],
  exports: [SessionService],
})
export class SessionModule {}
