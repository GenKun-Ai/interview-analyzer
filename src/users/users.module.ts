import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserEntity } from './entities/user.entity';
import { GoogleStrategy } from '../common/google.strategies';
import { JwtStrategy } from '../common/jwt.strategy';

/**
 * Users 모듈
 * - TypeORM: UserEntity 연결
 * - Passport: Google OAuth, JWT 전략 등록
 * - JWT: 토큰 생성용 (.env에서 JWT_SECRET 읽어옴, 기본값 1일)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]), // UserEntity 사용 설정
    PassportModule.register({ defaultStrategy: 'jwt' }), // Passport 기본 전략: jwt
    JwtModule.registerAsync({ // 다른 프로바이더를 필요, 모듈 초기화 생성, 중첩 사용 그리고 팩토리함수 단일책임으로 초기화
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || configService.get<string>('SECRET_KEY') || 'default-secret-key',
        signOptions: {
          expiresIn: '1d' as const, // 토큰 만료 시간: 1일
        },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, GoogleStrategy, JwtStrategy], // GoogleStrategy, JwtStrategy Provider 등록
  exports: [UsersService, TypeOrmModule], // UserRepository도 export (JwtStrategy에서 사용)
})
export class UsersModule {}
