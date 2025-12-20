import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class TranscribeAudioDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  audio: Express.Multer.File // 오디오 파일

  @ApiProperty()
  @IsString()
  sessionId: string // 세션 ID

  @ApiProperty({ enum: ['ja', 'ko'], example: 'ja' })
  @IsEnum(['ja', 'ko'])
  language: string // 오디오 언어

  @ApiProperty({ default: true })
  @IsOptional()
  enableSpeakerDiarization?: boolean; // 화자 분리 활성화 여부 (선택 사항)
}