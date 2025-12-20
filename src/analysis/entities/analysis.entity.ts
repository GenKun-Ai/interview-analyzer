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
  session: SessionEntity

  @Column({ type: 'varchar' })
  sessionId: string

  @Column({ type: 'jsonb' })
  structuralAnalysis: StructuralAnalysis

  @Column({ type: 'jsonb' })
  speechHabits: SpeechHabits

  @Column({ type: 'float' })
  overallScore: number

  @Column({ type: 'jsonb' })
  recommendations: string[]

  @Column({ type: 'varchar' })
  engineUsed: string
}
