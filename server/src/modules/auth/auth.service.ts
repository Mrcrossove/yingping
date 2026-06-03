import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationService: NotificationService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('账号或密码错误');
    if (user.status === 0) throw new UnauthorizedException('账号已被禁用');
    if (user.status === 2) throw new UnauthorizedException('账号待审核');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('账号或密码错误');

    const userInfo = await this.toUserInfo(user);
    const token = this.signToken(user);
    return { token, user: userInfo };
  }

  async wxLogin(code: string, promoterCode?: string) {
    if (!code) throw new BadRequestException('缺少登录凭证');

    const appId = process.env.WX_APPID || 'wx_placeholder';
    const secret = process.env.WX_SECRET || 'secret_placeholder';

    let openid: string;
    try {
      const res = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
        params: { appid: appId, secret, js_code: code, grant_type: 'authorization_code' },
      });
      if (res.data.errcode) throw new BadRequestException(`微信登录失败: ${res.data.errmsg}`);
      openid = res.data.openid;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('微信服务暂不可用');
    }

    let user = await this.prisma.user.findUnique({ where: { openid } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          username: `wx_${openid.slice(-8)}`,
          password: await bcrypt.hash(openid, 10),
          realName: '微信用户',
          role: 'merchant',
          openid,
        },
      });
    }
    if (user.status === 0) throw new UnauthorizedException('账号已被禁用');
    if (user.status === 2) throw new UnauthorizedException('账号待审核');

    await this.bindPromoterIfNeeded(user.id, promoterCode);

    const userInfo = await this.toUserInfo(user);
    const token = this.signToken(user);
    return { token, user: userInfo, isNew: !user.realName };
  }

  async register(data: {
    username: string; password: string; realName: string; role?: string; phone?: string; promoterCode?: string;
    shopAddress?: string; description?: string; licenseImage?: string;
  }) {
    const exists = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (exists) throw new UnauthorizedException('账号已存在');

    const hashed = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        password: hashed,
        realName: data.realName,
        role: 'merchant',
        phone: data.phone,
        status: 2,
        merchantProfile: {
          create: {
            shopName: data.realName,
            shopAddress: data.shopAddress,
            description: data.description,
            licenseImage: data.licenseImage,
            contactName: data.realName,
            contactPhone: data.phone,
          },
        },
      },
    });
    await this.bindPromoterIfNeeded(user.id, data.promoterCode);
    await this.safeNotifyRoles(['boss', 'admin'], {
      title: '有新的商户入驻申请',
      content: `${data.realName} 提交了商户入驻申请`,
      type: 'merchant',
    });
    const userInfo = await this.toUserInfo(user);
    return userInfo;
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return this.toUserInfo(user);
  }

  async bindPhone(userId: number, phone: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { phone } });
  }

  async bindOpenid(userId: number, openid: string) {
    const exists = await this.prisma.user.findUnique({ where: { openid } });
    if (exists && exists.id !== userId) throw new BadRequestException('该微信已绑定其他账号');
    return this.prisma.user.update({ where: { id: userId }, data: { openid } });
  }

  private signToken(user: any) {
    return this.jwtService.sign({
      sub: user.id, username: user.username, role: user.role,
    });
  }

  private async bindPromoterIfNeeded(merchantId: number, promoterCode?: string) {
    const codeText = promoterCode?.trim();
    if (!codeText) return;

    const code = await this.prisma.promotionCode.findUnique({ where: { code: codeText } });
    if (!code || code.status === 0) return;

    const existing = await this.prisma.merchantBinding.findUnique({ where: { merchantId } });
    if (existing) return;

    await this.prisma.merchantBinding.create({
      data: { merchantId, promoterId: code.promoterId },
    });
  }

  private async safeNotifyRoles(roles: string[], data: { title: string; content?: string; type?: string }) {
    try { await this.notificationService.createForRoles(roles, data); } catch {}
  }

  private async toUserInfo(user: any) {
    const { password: _, ...userInfo } = user;
    if (user.role === 'boss') return { ...userInfo, permissions: ['*'] };
    if (user.role !== 'admin') return { ...userInfo, permissions: [] };

    const permissions = await this.prisma.adminPermission.findMany({
      where: { adminId: user.id },
      include: { permission: true },
    });
    return { ...userInfo, permissions: permissions.map((item) => item.permission.code) };
  }
}
