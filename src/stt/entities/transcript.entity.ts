// stt/entities/transcript.entity.ts

import { CommonEntity } from 'src/common/entities/common.entity'
import { SessionEntity } from 'src/session/session.entity'
import { Column, Entity, JoinColumn, OneToOne, RelationId } from 'typeorm'
import type { TranscriptSegment, Speaker } from 'src/common/interfaces/stt-engine.interface'

@Entity('transcripts')
export class TranscriptEntity extends CommonEntity {
  @OneToOne(() => SessionEntity, (session) => session.transcript, {
    onDelete: 'CASCADE'
  })
  @JoinColumn()
  session: SessionEntity; // 변환과 연결된 세션

  @RelationId((transcript: TranscriptEntity) => transcript.session)
  sessionId: string; // 세션 ID

  @Column({ type: 'jsonb' })
  segments: TranscriptSegment[]; // 텍스트 세그먼트 목록

  @Column({ type: 'jsonb', nullable: true })
  speakers?: Speaker[]; // 화자 정보 (선택 사항)

  @Column({ type: 'varchar' })
  language: string; // 감지된 언어

  @Column({ type: 'float' })
  duration: number; // 오디오 길이 (초 단위, 소수점 포함)

  @Column({ type: 'text' })
  fullText: string; // 전체 텍스트
}
