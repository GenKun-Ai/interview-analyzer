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
  @Column({ type: 'varchar', length: 10 })
  language: string

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

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  originalAudioPath?: string;

  @Column({ type: 'integer', nullable: true})
  audioDuration?: number;

  @Column({ type: 'boolean', default: false})
  deleteAfterAnalysis: boolean;

  @OneToOne(() => TranscriptEntity, transcript => transcript.session, { cascade: true })
  transcript?: TranscriptEntity;

  @OneToOne(() => AnalysisEntity, analysis => analysis.session, { cascade: true })
  analysis?: AnalysisEntity;
}
