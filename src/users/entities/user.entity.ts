import { ApiProperty } from "@nestjs/swagger";
import { CommonEntity } from "src/common/entities/common.entity";
import { SessionEntity } from "src/session/session.entity";
import { Column, Entity, JoinColumn, OneToMany } from "typeorm";

// 유저 권한: 관리자 / 일반 유저
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

// Google OAuth 로그인 유저 테이블
@Entity({ name: 'USERS' })
export class UserEntity extends CommonEntity {
  @ApiProperty({ description: 'Google OAuth ID', example: '1234567890' })
  @Column({ type: 'varchar', length: 255, unique: true }) // 중복 가입 방지
  googleId: string

  @ApiProperty({ description: '유저 이메일', example: 'abc@gmail.com' })
  @Column({ type: 'varchar', length: 100, unique: true }) // 중복 가입 방지
  email: string

  @ApiProperty({ description: '유저 이름', example: '홍길동' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string

  @ApiProperty({
    description: '유저 권한',
    enum: UserRole,
    example: UserRole.USER,
  })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER, // 기본값: 일반 유저
  })
  role: UserRole

  // 역관계 (1 -> N)
  @OneToMany(() => SessionEntity, (session) => session.userId)
  session: SessionEntity[] // 분석과 연결된 세션
}
