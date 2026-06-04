import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EarningService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: number, query: { page?: number; pageSize?: number; status?: string; keyword?: string }) {
    const { page = 1, pageSize = 20 } = query;
    const where: any = { userId };
    if (query.status) where.status = query.status;
    if (query.keyword) where.orderNo = { contains: query.keyword };

    const [list, total] = await Promise.all([
      this.prisma.earning.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        include: {
          order: { select: { id: true, totalAmount: true, status: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.earning.count({ where }),
    ]);

    const summary = await this.getUserSummary(userId);

    return {
      list,
      total,
      page,
      pageSize,
      ...summary,
    };
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    userId?: number;
    role?: string;
    status?: string;
    keyword?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, pageSize = 20, userId } = query;
    const where: any = {};
    if (userId) where.userId = +userId;
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.keyword) where.orderNo = { contains: query.keyword };
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate + 'T23:59:59');
    }

    const [list, total] = await Promise.all([
      this.prisma.earning.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        include: {
          user: { select: { id: true, realName: true, role: true, phone: true } },
          order: { select: { id: true, totalAmount: true, status: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.earning.count({ where }),
    ]);

    const [sum, byRole, byUser] = await Promise.all([
      this.prisma.earning.aggregate({ where, _sum: { amount: true } }),
      this.prisma.earning.groupBy({
        by: ['role'],
        where,
        _sum: { amount: true },
      }),
      this.prisma.earning.groupBy({
        by: ['userId'],
        where,
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
    ]);

    const users = byUser.length
      ? await this.prisma.user.findMany({
          where: { id: { in: byUser.map((u) => u.userId) } },
          select: { id: true, realName: true, role: true, phone: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      list,
      total,
      page,
      pageSize,
      totalAmount: Number(sum._sum.amount || 0),
      byRole: byRole.map((r) => ({ role: r.role, total: Number(r._sum.amount || 0) })),
      topUsers: byUser.map((u) => ({
        user: userMap.get(u.userId),
        total: Number(u._sum.amount || 0),
        count: u._count.id,
      })),
    };
  }

  private async getUserSummary(userId: number) {
    const [totalAmount, pendingAmount, settledAmount, withdrawnEarningAmount, occupiedAmount, paidAmount] = await Promise.all([
      this.prisma.earning.aggregate({ where: { userId }, _sum: { amount: true } }),
      this.prisma.earning.aggregate({ where: { userId, status: 'pending_settle' }, _sum: { amount: true } }),
      this.prisma.earning.aggregate({ where: { userId, status: 'settled' }, _sum: { amount: true } }),
      this.prisma.earning.aggregate({ where: { userId, status: 'withdrawn' }, _sum: { amount: true } }),
      this.prisma.withdrawal.aggregate({
        where: { userId, status: { in: ['pending', 'approved', 'paid'] } },
        _sum: { amount: true },
      }),
      this.prisma.withdrawal.aggregate({ where: { userId, status: 'paid' }, _sum: { amount: true } }),
    ]);

    const pending = Number(pendingAmount._sum.amount || 0);
    const occupied = Number(occupiedAmount._sum.amount || 0);
    return {
      totalAmount: Number(totalAmount._sum.amount || 0),
      pendingAmount: pending,
      settledAmount: Number(settledAmount._sum.amount || 0),
      withdrawnEarningAmount: Number(withdrawnEarningAmount._sum.amount || 0),
      withdrawnAmount: occupied,
      paidAmount: Number(paidAmount._sum.amount || 0),
      availableAmount: Math.max(0, pending - occupied),
    };
  }
}
