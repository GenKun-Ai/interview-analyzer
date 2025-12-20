import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class TranscribeAudioDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  audio: Express.Multer.File

  @ApiProperty()
  @IsString()
  sessionId: string

  @ApiProperty({ enum: ['ja', 'ko'], example: 'ja' })
  @IsEnum(['ja', 'ko'])
  language: string

  @ApiProperty({ default: true })
  @IsOptional()
  enableSpeakerDiarization?: boolean;
}