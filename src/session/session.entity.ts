import { CommonEntity } from 'src/common/entities/common.entity'
import { Column, Entity } from 'typeorm'

@Entity({ name: 'SESSION' })
export class SessionEntity extends CommonEntity {
    
  @Column()
  language: string

  @Column({
    type: 'enum',
    enum: ['CREATED', 'PROCESSING', 'COMPLETED'],
    default: 'CREATED',
  })
  status: string
}
