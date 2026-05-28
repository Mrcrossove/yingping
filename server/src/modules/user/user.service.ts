import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: number; pageSize?: number; role?: string; keyword?: string }) {
    const { page = 1, pageSize = 20, role, keyword } = query;
    const where: any = {};
    if (role) where.role = role;
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
        take: pageSize,
        select: { id: true, username: true, realName: true, role: true, phone: true, avatar: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, realName: true, role: true, phone: true, avatar: true, status: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
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
}
