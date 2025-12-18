import { Module } from '@nestjs/common';
import { SttService } from './stt.service';

@Module({
  providers: [SttService]
})
export class SttModule {}
