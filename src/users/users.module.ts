import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserEntity } from './entities/user.entity';
import { GoogleStrategy } from '../common/google.strategies';

/**
 * Users 모듈
 * - TypeORM: UserEntity 연결
 * - Passport: Google OAuth 전략 등록
 * - JWT: 토큰 생성용 (.env에서 JWT_SECRET 읽어옴, 기본값 1일)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]), // UserEntity 사용 설정
    PassportModule.register({ defaultStrategy: 'google' }), // Passport 기본 전략: google
    JwtModule.registerAsync({
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
  providers: [UsersService, GoogleStrategy], // GoogleStrategy Provider 등록
  exports: [UsersService], // 다른 모듈에서 UsersService 사용 가능하도록 export
})
export class UsersModule {}
