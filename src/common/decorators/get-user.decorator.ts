import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';

/**
 * 현재 로그인한 유저 정보 가져오기
 *
 * 사용법:
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@GetUser() user: UserEntity) {
 *   return user;
 * }
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // JwtStrategy.validate()에서 설정한 UserEntity
  },
);
