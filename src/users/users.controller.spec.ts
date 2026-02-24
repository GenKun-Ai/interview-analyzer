import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser: Partial<UserEntity> = {
    id: 'user-id-1',
    email: 'test@example.com',
    name: '테스트 유저',
  };

  beforeEach(async () => {
    const mockUsersService = {
      googleLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });

  describe('googleLoginCallback', () => {
    it('JWT 토큰을 쿠키에 설정하고 프론트엔드로 리다이렉트해야 함', async () => {
      // Given
      const mockReq = {
        user: { googleId: 'google-123', email: 'test@example.com', name: '테스트 유저' },
      } as any;

      const mockRes = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as any;

      usersService.googleLogin.mockResolvedValue({
        token: 'mock-jwt-token',
        user: mockUser as UserEntity,
      });

      // When
      await controller.googleLoginCallback(mockReq, mockRes);

      // Then
      expect(usersService.googleLogin).toHaveBeenCalledWith(mockReq);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'accessToken',
        'mock-jwt-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockRes.redirect).toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('현재 로그인한 유저 정보를 반환해야 함', () => {
      // When
      const result = controller.getMe(mockUser as UserEntity);

      // Then
      expect(result).toEqual(mockUser);
    });
  });
});
