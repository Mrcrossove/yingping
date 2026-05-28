import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('账号或密码错误');
    if (user.status === 0) throw new UnauthorizedException('账号已被禁用');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('账号或密码错误');

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    const { password: _, ...userInfo } = user;
    return { token, user: userInfo };
  }

  async register(data: {
    username: string;
    password: string;
    realName: string;
    role: string;
    phone?: string;
  }) {
    const exists = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (exists) throw new UnauthorizedException('账号已存在');

    const hashed = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        password: hashed,
        realName: data.realName,
        role: data.role as any,
        phone: data.phone,
      },
    });
    const { password: _, ...userInfo } = user;
    return userInfo;
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    const { password: _, ...userInfo } = user;
    return userInfo;
  }
}
