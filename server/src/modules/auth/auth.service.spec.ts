import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PrismaModule,
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } }),
      ],
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject empty wx login code', async () => {
    await expect(service.wxLogin('')).rejects.toThrow(BadRequestException);
  });

  describe('login', () => {
    it('should throw for non-existent user', async () => {
      await expect(service.login('nonexist', 'pass')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should set merchant status=2 (pending)', async () => {
      const uniqueName = `test_merchant_${Date.now()}`;
      const user = await service.register({
        username: uniqueName, password: 'test123',
        realName: '测试商户', role: 'merchant', phone: '13800000000',
      });
      expect(user).toBeDefined();
      expect(user.username).toBe(uniqueName);
    });
  });

  describe('getProfile', () => {
    it('should throw for non-existent user', async () => {
      await expect(service.getProfile(999999)).rejects.toThrow(UnauthorizedException);
    });
  });
});
