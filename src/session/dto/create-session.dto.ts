import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateSessionDto {
  @ApiProperty({ enum: ['ja', 'ko'], example: 'ja' })
  @IsEnum(['ja', 'ko'])
  language: string // 세션 언어 (일본어 또는 한국어)

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description: string // 세션 설명 (선택 사항)

  @ApiProperty({ required: false })
  @IsString()
  userId: string;
}