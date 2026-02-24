import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: Partial<UserEntity> = {
    id: 'user-id-1',
    googleId: 'google-123',
    email: 'test@example.com',
    name: '테스트 유저',
  };

  beforeEach(async () => {
    const mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  it('서비스가 정의되어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('googleLogin', () => {
    const googleReq = {
      user: {
        googleId: 'google-123',
        email: 'test@example.com',
        name: '테스트 유저',
      },
    };

    it('기존 유저 로그인 시 새로 생성하지 않고 JWT를 반환해야 함', async () => {
      // Given
      userRepository.findOne.mockResolvedValue(mockUser as UserEntity);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      // When
      const result = await service.googleLogin(googleReq);

      // Then
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: googleReq.user.email },
      });
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        sub: mockUser.id,
      });
      expect(result).toEqual({ token: 'mock-jwt-token', user: mockUser });
    });

    it('신규 유저 로그인 시 자동 회원가입 후 JWT를 반환해야 함', async () => {
      // Given
      userRepository.findOne.mockResolvedValue(null); // 기존 유저 없음
      userRepository.create.mockReturnValue(mockUser as UserEntity);
      userRepository.save.mockResolvedValue(mockUser as UserEntity);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      // When
      const result = await service.googleLogin(googleReq);

      // Then
      expect(userRepository.create).toHaveBeenCalledWith({
        googleId: googleReq.user.googleId,
        email: googleReq.user.email,
        name: googleReq.user.name,
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result.token).toBe('mock-jwt-token');
    });

    it('user 정보가 없으면 UnauthorizedException을 던져야 함', async () => {
      // Given
      const reqWithoutUser = { user: null } as any;

      // When & Then
      await expect(service.googleLogin(reqWithoutUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
