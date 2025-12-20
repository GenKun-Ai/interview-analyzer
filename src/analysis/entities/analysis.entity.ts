import { CommonEntity } from "src/common/entities/common.entity"
import type {
  StructuralAnalysis,
  SpeechHabits,
} from 'src/common/interfaces/analysis-engine.interface'
import { SessionEntity } from "src/session/session.entity"
import { Column, Entity, JoinColumn, OneToOne } from "typeorm"

// analysis/entities/analysis.entity.ts
@Entity('analyses')
export class AnalysisEntity extends CommonEntity {
  @OneToOne(() => SessionEntity, (session) => session.analysis)
  @JoinColumn()
  session: SessionEntity; // 분석과 연결된 세션

  @Column({ type: 'varchar' })
  sessionId: string; // 세션 ID

  @Column({ type: 'jsonb' })
  structuralAnalysis: StructuralAnalysis; // 구조적 분석 결과

  @Column({ type: 'jsonb' })
  speechHabits: SpeechHabits; // 말하기 습관 분석 결과

  @Column({ type: 'float' })
  overallScore: number; // 전체 점수

  @Column({ type: 'jsonb' })
  recommendations: string[]; // 개선 추천 사항

  @Column({ type: 'varchar' })
  engineUsed: string; // 사용된 분석 엔진
}
