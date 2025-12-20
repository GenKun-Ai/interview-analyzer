// stt/entities/transcript.entity.ts

import { CommonEntity } from 'src/common/entities/common.entity'
import { SessionEntity } from 'src/session/session.entity'
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm'

// 임시 타입 정의 
interface TranscriptSegment {
  id: number; // 세그먼트 ID
  startTime: number; // 시작 시간
  endTime: number; // 종료 시간
  text: string; // 텍스트 내용
  speaker: string; // 화자
  confidence: number; // 신뢰도
}

interface Speaker {
  id: string; // 화자 ID
  label: string; // 화자 레이블
}

@Entity('transcripts')
export class TranscriptEntity extends CommonEntity {
  @OneToOne(() => SessionEntity, (session) => session.transcript)
  @JoinColumn()
  session: SessionEntity; // 변환과 연결된 세션

  @Column({ type: 'varchar' })
  sessionId: string; // 세션 ID

  @Column({ type: 'jsonb' })
  segments: TranscriptSegment[]; // 텍스트 세그먼트 목록

  @Column({ type: 'jsonb', nullable: true })
  speakers?: Speaker[]; // 화자 정보 (선택 사항)

  @Column({ type: 'varchar' })
  language: string; // 감지된 언어

  @Column({ type: 'integer' })
  duration: number; // 오디오 길이

  @Column({ type: 'text' })
  fullText: string; // 전체 텍스트
}
