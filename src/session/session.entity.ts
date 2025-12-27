import { ApiProperty } from '@nestjs/swagger';
import { AnalysisEntity } from 'src/analysis/entities/analysis.entity';
import { CommonEntity } from 'src/common/entities/common.entity'
import { TranscriptEntity } from 'src/stt/entities/transcript.entity';
import { Column, Entity, OneToOne } from 'typeorm'

// 임시 타입 정의
type SessionStatus =
  | 'CREATED'
  | 'UPLOADING'
  | 'TRANSCRIBING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED';
@Entity({ name: 'SESSION' })
export class SessionEntity extends CommonEntity {
  @ApiProperty({ description: '세션 언어', example: 'ja' })
  @Column({ type: 'varchar', length: 10 })
  language: string

  @ApiProperty({
    description: '세션 처리 상태',
    enum: ['CREATED', 'UPLOADING', 'TRANSCRIBING', 'ANALYZING', 'COMPLETED', 'FAILED'],
    example: 'CREATED'
  })
  @Column({
    type: 'enum',
    enum: [
      'CREATED',
      'UPLOADING',
      'TRANSCRIBING',
      'ANALYZING',
      'COMPLETED',
      'FAILED',
    ],
    default: 'CREATED',
  })
  status: SessionStatus;

  @ApiProperty({ description: '세션 설명', required: false, nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: '원본 오디오 파일 경로', required: false, nullable: true, example: 'memory://interview.mp3' })
  @Column({ type: 'varchar', nullable: true })
  originalAudioPath?: string;

  @ApiProperty({ description: '오디오 길이 (초)', required: false, nullable: true, example: 125 })
  @Column({ type: 'integer', nullable: true})
  audioDuration?: number;

  @ApiProperty({ description: '분석 완료 후 파일 자동 삭제 여부', default: false })
  @Column({ type: 'boolean', default: false})
  deleteAfterAnalysis: boolean;

  @ApiProperty({ description: '에러 메시지 (실패 시)', required: false, nullable: true })
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @ApiProperty({ description: 'STT 변환 결과', type: () => TranscriptEntity, required: false })
  @OneToOne(() => TranscriptEntity, transcript => transcript.session, { cascade: true })
  transcript?: TranscriptEntity;

  @ApiProperty({ description: '분석 결과', type: () => AnalysisEntity, required: false })
  @OneToOne(() => AnalysisEntity, analysis => analysis.session, { cascade: true })
  analysis?: AnalysisEntity;
}
