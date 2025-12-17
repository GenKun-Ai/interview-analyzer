
import { IsUUID } from 'class-validator';
import { Exclude } from 'class-transformer'; 
import { CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export abstract class CommonEntity {
    @IsUUID()
    @PrimaryGeneratedColumn('uuid')
    id: string

    // 해당 열이 추가된 시각을 자동으로 기록
    // 만일 Postgres의 time zone이 'UTC'라면 UTC 기준으로 출력하고 'Asia/Seoul'라면 서울 기준으로 출력
    // DB SQL QUERY : set time zone 'Asiz/Seoul'; set time zone 'UTC'; show timezone;
    @CreateDateColumn({
        type: 'timestamptz' /* timestamp with time zone */
    })
    createAt: Date

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date

    // Soft Delete: 기존에는 null, 삭제시에는 timestamp 찍기
    @Exclude()
    @DeleteDateColumn({ type: 'timestamptz' })
    deletedAt?: Date | null
}