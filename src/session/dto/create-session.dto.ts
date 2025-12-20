import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateSessionDto {
    @ApiProperty({ enum: ['ja', 'ko'], example: 'ja' })
    @IsEnum(['ja', 'ko'])
    language: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description: string;
}