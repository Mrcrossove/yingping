import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EarningService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: number, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;
    const where = { userId };

    const [list, total] = await Promise.all([
      this.prisma.earning.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.earning.count({ where }),
    ]);

    const totalAmount = await this.prisma.earning.aggregate({
      where: { userId, status: 'pending_settle' },
      _sum: { amount: true },
    });

    const withdrawnAmount = await this.prisma.withdrawal.aggregate({
      where: { userId, status: 'approved' },
      _sum: { amount: true },
    });

    return {
      list,
      total,
      page,
      pageSize,
      pendingAmount: totalAmount._sum.amount || 0,
      withdrawnAmount: withdrawnAmount._sum.amount || 0,
    };
  }

  async findAll(query: { page?: number; pageSize?: number; userId?: number }) {
    const { page = 1, pageSize = 20, userId } = query;
    const where: any = {};
    if (userId) where.userId = +userId;

    const [list, total] = await Promise.all([
      this.prisma.earning.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        include: {
          user: { select: { id: true, realName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.earning.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }
}
