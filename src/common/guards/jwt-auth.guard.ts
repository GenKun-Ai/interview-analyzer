import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT 인증 Guard
 * - @UseGuards(JwtAuthGuard) 사용
 * - Authorization: Bearer <token> 헤더 검증
 * - 검증 성공 시 req.user에 UserEntity 저장
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
