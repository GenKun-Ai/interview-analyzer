// stt/entities/transcript.entity.ts

import { CommonEntity } from 'src/common/entities/common.entity'
import { SessionEntity } from 'src/session/session.entity'
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm'

// 임시 타입 정의 
interface TranscriptSegment {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string;
  confidence: number;
}

interface Speaker {
  id: string;
  label: string;
}

@Entity('transcripts')
export class TranscriptEntity extends CommonEntity {
  @OneToOne(() => SessionEntity, (session) => session.transcript)
  @JoinColumn()
  session: SessionEntity

  @Column({ type: 'varchar' })
  sessionId: string

  @Column({ type: 'jsonb' })
  segments: TranscriptSegment[]

  @Column({ type: 'jsonb', nullable: true })
  speakers?: Speaker[]

  @Column({ type: 'varchar' })
  language: string

  @Column({ type: 'integer' })
  duration: number

  @Column({ type: 'text' })
  fullText: string
}
