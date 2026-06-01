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

    const occupiedAmount = await this.prisma.withdrawal.aggregate({
      where: { userId, status: { in: ['pending', 'approved', 'paid'] } },
      _sum: { amount: true },
    });

    const pendingAmount = Number(totalAmount._sum.amount || 0);
    const withdrawnAmount = Number(occupiedAmount._sum.amount || 0);

    return {
      list,
      total,
      page,
      pageSize,
      pendingAmount,
      withdrawnAmount,
      availableAmount: Math.max(0, pendingAmount - withdrawnAmount),
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
