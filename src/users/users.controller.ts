import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserEntity } from './entities/user.entity';

// Google OAuth 인증 후 req.user 타입
interface GoogleRequest extends Request {
  user: {
    googleId: string;
    email: string;
    name: string;
  };
}

/**
 * Users 컨트롤러
 * - Google OAuth 로그인 엔드포인트
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/google
   * Google 로그인 시작 (Google 로그인 페이지로 리다이렉트)
   */
  @Get("google")
  @UseGuards(AuthGuard('google')) // Passport Guard가 Google OAuth 플로우 시작
  async googleLogin() {
    // Guard가 자동으로 Google 로그인 페이지로 리다이렉트
  }

  /**
   * GET /users/google/callback
   * Google 로그인 완료 후 콜백
   * - GoogleStrategy.validate()에서 받은 user 정보로 JWT 발급
   * - 쿠키에 토큰 저장 후 프론트엔드로 리다이렉트
   */
  @Get("google/callback")
  @UseGuards(AuthGuard('google')) // Google 인증 완료 후 req.user에 정보 저장
  async googleLoginCallback(@Req() req: GoogleRequest, @Res() res: Response) {
    const { token } = await this.usersService.googleLogin(req);

    // 쿠키에 JWT 토큰 저장
    res.cookie('accessToken', token, {
      httpOnly: true,  // XSS 방지 (JavaScript로 접근 불가)
      secure: false,   // 개발 환경: false, 프로덕션: true (HTTPS 필수)
      maxAge: 24 * 60 * 60 * 1000, // 1일
      sameSite: 'lax', // CSRF 방지
    });

    // 프론트엔드로 리다이렉트 (토큰은 쿠키에 있으므로 URL에 포함 안 함)
    return res.redirect('http://localhost:5173/');
  }

  /**
   * GET /users/me
   * 현재 로그인한 사용자 정보 조회
   * - 쿠키의 JWT 토큰으로 인증
   * - 프론트엔드에서 로그인 상태 확인용
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@GetUser() user: UserEntity) {
    return user;
  }
}
