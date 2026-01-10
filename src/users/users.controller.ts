import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
   * - 반환: { token: string, user: UserEntity }
   */
  @Get("google/callback")
  @UseGuards(AuthGuard('google')) // Google 인증 완료 후 req.user에 정보 저장
  googleLoginCallback(@Req() req: GoogleRequest) {
    return this.usersService.googleLogin(req); // JWT 토큰 발급 및 유저 정보 반환
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
