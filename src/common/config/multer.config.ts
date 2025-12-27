import { diskStorage } from 'multer';
import { Request } from 'express';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Multer 설정: 디스크 저장, 파일 크기 제한, MIME 타입 검증
 */
export const multerConfig: MulterOptions = {
  storage: diskStorage({
    // 저장 경로: uploads/{sessionId}/
    destination: (req: Request, file: Express.Multer.File, cb) => {
      const sessionId = req.params.id;
      const uploadPath = `./uploads/${sessionId}`;

      // 세션별 폴더 생성 (동기적으로)
      const fs = require('fs');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },

    // 파일명: 원본명 유지 (타임스탬프 추가로 중복 방지)
    filename: (req: Request, file: Express.Multer.File, cb) => {
      const uniqueSuffix = Date.now();
      const ext = extname(file.originalname);
      const basename = file.originalname.replace(ext, '');
      cb(null, `${basename}-${uniqueSuffix}${ext}`);
    },
  }),

  // 파일 크기 제한: 30MB (OpenAI Whisper 최대 25MB + 여유)
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB in bytes
  },

  // MIME 타입 검증: audio/* 만 허용
  fileFilter: (req: Request, file: Express.Multer.File, cb) => {
    const allowedMimeTypes = [
      'audio/mpeg',       // MP3
      'audio/mp3',        // MP3 (alternative)
      'audio/wav',        // WAV
      'audio/wave',       // WAV (alternative)
      'audio/x-wav',      // WAV (alternative)
      'audio/mp4',        // M4A
      'audio/m4a',        // M4A
      'audio/x-m4a',      // M4A (alternative)
      'audio/ogg',        // OGG
      'audio/webm',       // WebM
      'audio/flac',       // FLAC
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true); // 허용
    } else {
      cb(
        new BadRequestException(
          `지원하지 않는 파일 형식입니다. 허용 형식: ${allowedMimeTypes.join(', ')}`
        ),
        false
      );
    }
  },
};
