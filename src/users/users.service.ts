import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

// Google OAuth 인증 후 req.user 타입
interface GoogleRequest {
  user: {
    googleId: string;
    email: string;
    name: string;
  };
}

@Injectable()
export class UsersService {
  // DI: UserRepository, JwtService 주입
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Google 로그인 처리
   * 1. 이메일로 기존 유저 조회
   * 2. 없으면 신규 유저 생성 (자동 회원가입)
   * 3. JWT 토큰 발급 후 반환
   */
  async googleLogin(req: GoogleRequest) {
    const { user } = req;

    if (!user) {
      throw new UnauthorizedException('구글 인증 실패');
    }

    // 기존 유저 찾기
    let findUser = await this.userRepository.findOne({
      where: { email: user.email }
    });

    // 신규 유저면 자동 회원가입
    if (!findUser) {
      findUser = this.userRepository.create({
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        // role은 UserEntity에서 기본값 USER로 자동 설정됨
      });
      await this.userRepository.save(findUser);
    }

    // JWT 토큰 생성 (payload: email, user ID)
    const payload = { email: findUser.email, sub: findUser.id };
    const token = this.jwtService.sign(payload);

    return { token, user: findUser };
  }
}
