import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

/**
 * JWT 인증 전략
 * - Authorization: Bearer <token> 헤더에서 JWT 검증
 * - payload에서 userId 추출 → UserEntity 조회 → req.user에 저장
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Bearer 토큰 추출
      ignoreExpiration: false, // 만료된 토큰 거부
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key', // JWT 서명 키
    });
  }

  /**
   * JWT 검증 성공 시 호출
   * @param payload - { email: string, sub: string (userId) }
   * @returns UserEntity - req.user에 저장됨
   */
  async validate(payload: { email: string; sub: string }) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }

    return user; // req.user = UserEntity
  }
}
