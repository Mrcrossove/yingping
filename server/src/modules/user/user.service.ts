import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { NotificationService } from '../notification/notification.service';

const EMPLOYEE_ROLES = ['boss', 'admin', 'salesperson', 'maker', 'delivery', 'promoter'];

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async findAll(query: { page?: number; pageSize?: number; role?: string; keyword?: string; status?: number }) {
    const { page = 1, pageSize = 20, role, keyword, status } = query;
    const where: any = {};
    if (role && EMPLOYEE_ROLES.includes(role)) where.role = role;
    else where.role = { in: EMPLOYEE_ROLES as any[] };
    if (status !== undefined) where.status = +status;
    if (keyword) {
      where.OR = [
        { realName: { contains: keyword } },
        { phone: { contains: keyword } },
        { username: { contains: keyword } },
      ];
    }
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        select: {
          id: true,
          username: true,
          realName: true,
          role: true,
          phone: true,
          avatar: true,
          status: true,
          createdAt: true,
          merchantProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async getEarningOptions(query: { role?: string; keyword?: string }) {
    const roles = ['salesperson', 'maker', 'delivery', 'promoter'];
    const where: any = {
      role: query.role && roles.includes(query.role) ? query.role : { in: roles as any[] },
      status: 1,
    };
    if (query.keyword) {
      where.OR = [
        { realName: { contains: query.keyword } },
        { phone: { contains: query.keyword } },
        { username: { contains: query.keyword } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: { id: true, realName: true, role: true, phone: true },
      orderBy: [{ role: 'asc' }, { id: 'desc' }],
      take: 200,
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        phone: true,
        avatar: true,
        status: true,
        createdAt: true,
        merchantProfile: true,
      },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async getDispatchStaff(role: string) {
    if (!['maker', 'delivery'].includes(role)) {
      throw new BadRequestException('员工角色不正确');
    }

    return this.prisma.user.findMany({
      where: { role: role as any, status: 1 },
      select: { id: true, realName: true, phone: true, role: true },
      orderBy: { id: 'desc' },
    });
  }

  async getMerchants(query: { page?: number; pageSize?: number; keyword?: string }) {
    const { page = 1, pageSize = 50, keyword } = query;
    const where: any = { role: 'merchant', status: 1 };
    if (keyword) {
      where.OR = [
        { realName: { contains: keyword } },
        { phone: { contains: keyword } },
        { username: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        select: {
          id: true,
          username: true,
          realName: true,
          phone: true,
          status: true,
          merchantProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async getMyMerchantProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        realName: true,
        phone: true,
        role: true,
        merchantProfile: true,
      },
    });
    if (!user || user.role !== 'merchant') throw new ForbiddenException('只有商户可以维护商户信息');
    return user;
  }

  async updateMyMerchantProfile(userId: number, data: {
    shopName?: string;
    contactName?: string;
    contactPhone?: string;
    shopAddress?: string;
    description?: string;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'merchant') throw new ForbiddenException('只有商户可以维护商户信息');

    const shopName = (data.shopName || '').trim();
    const contactName = (data.contactName || '').trim();
    const contactPhone = (data.contactPhone || '').trim();
    const shopAddress = (data.shopAddress || '').trim();
    const description = (data.description || '').trim();
    if (!shopName) throw new BadRequestException('请填写商户名称');
    if (!contactName) throw new BadRequestException('请填写联系人');
    if (!/^1\d{10}$/.test(contactPhone)) throw new BadRequestException('请填写正确手机号');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { realName: shopName, phone: contactPhone },
      });
      await tx.merchantProfile.upsert({
        where: { userId },
        create: {
          userId,
          shopName,
          contactName,
          contactPhone,
          shopAddress,
          description,
        },
        update: {
          shopName,
          contactName,
          contactPhone,
          shopAddress,
          description,
        },
      });
    });

    return this.getMyMerchantProfile(userId);
  }

  async getMerchantDashboard(query: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: number | string;
    bound?: string;
  }) {
    const { page = 1, pageSize = 20, keyword, status, bound } = query;
    const where: any = { role: 'merchant' };
    if (status !== undefined && status !== '') where.status = +status;
    if (bound === 'yes') where.merchantBindings = { some: {} };
    if (bound === 'no') where.merchantBindings = { none: {} };
    if (keyword) {
      where.OR = [
        { realName: { contains: keyword } },
        { phone: { contains: keyword } },
        { username: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * +pageSize,
        take: +pageSize,
        select: {
          id: true,
          username: true,
          realName: true,
          phone: true,
          status: true,
          createdAt: true,
          merchantProfile: true,
          merchantBindings: {
            select: {
              createdAt: true,
              promoter: {
                select: { id: true, realName: true, phone: true },
              },
            },
          },
          merchantOrders: {
            select: {
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formatted = list.map((merchant) => {
      const binding = merchant.merchantBindings[0];
      const totalAmount = merchant.merchantOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
      return {
        id: merchant.id,
        username: merchant.username,
        realName: merchant.realName,
        phone: merchant.phone,
        status: merchant.status,
        createdAt: merchant.createdAt,
        merchantProfile: merchant.merchantProfile,
        promoter: binding?.promoter || null,
        promoterBoundAt: binding?.createdAt || null,
        orderCount: merchant.merchantOrders.length,
        totalAmount,
        lastOrderAt: merchant.merchantOrders[0]?.createdAt || null,
      };
    });

    return { list: formatted, total, page, pageSize };
  }

  async create(data: { username: string; password: string; realName: string; role: string; phone?: string }, operator: any) {
    const exists = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (exists) throw new ForbiddenException('账号已存在');

    const hashed = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        username: data.username,
        password: hashed,
        realName: data.realName,
        role: data.role as any,
        phone: data.phone,
      },
      select: { id: true, username: true, realName: true, role: true, phone: true, avatar: true, status: true, createdAt: true },
    });
  }

  async update(id: number, data: { realName?: string; phone?: string; status?: number; role?: string; password?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');

    const updateData: any = {};
    if (data.realName !== undefined) updateData.realName = data.realName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, realName: true, role: true, phone: true, avatar: true, status: true, createdAt: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.user.update({ where: { id }, data: { status: 0 } });
    return { id };
  }
  async resetPassword(id: number, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return this.prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(newPassword, 10) },
      select: { id: true, username: true, realName: true },
    });
  }

  async getPendingMerchants(query: { page?: number; pageSize?: number }) {
    return this.findAll({ ...query, role: 'merchant', status: 2 });
  }

  async approveMerchant(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== 'merchant') throw new NotFoundException('商户不存在');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 1 },
      select: { id: true, realName: true, phone: true, status: true },
    });
    await this.safeNotifyUsers([id], {
      title: '商户审核已通过',
      content: '你的商户入驻申请已通过，可以登录使用系统',
      type: 'merchant',
    });
    return updated;
  }

  async rejectMerchant(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== 'merchant') throw new NotFoundException('商户不存在');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 0 },
      select: { id: true, realName: true, status: true },
    });
    await this.safeNotifyUsers([id], {
      title: '商户审核未通过',
      content: '你的商户入驻申请未通过，请联系管理员',
      type: 'merchant',
    });
    return updated;
  }

  private async safeNotifyUsers(userIds: number[], data: { title: string; content?: string; type?: string }) {
    try { await this.notificationService.createForUsers(userIds, data); } catch {}
  }
}
