import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      todayAmount,
      pendingOrders,
      makingOrders,
      deliveringOrders,
      totalUsers,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { not: 'cancelled' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.order.count({ where: { status: 'making' } }),
      this.prisma.order.count({ where: { status: 'delivering' } }),
      this.prisma.user.count({ where: { status: 1 } }),
    ]);

    return {
      todayOrders,
      todayAmount: todayAmount._sum.totalAmount || 0,
      pendingOrders,
      makingOrders,
      deliveringOrders,
      totalUsers,
    };
  }

  async getOrderTrend(days: number = 7) {
    const results: { date: string; count: number; amount: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const [count, amount] = await Promise.all([
        this.prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
        this.prisma.order.aggregate({
          where: { createdAt: { gte: start, lte: end }, status: { not: 'cancelled' } },
          _sum: { totalAmount: true },
        }),
      ]);

      results.push({
        date: start.toISOString().slice(0, 10),
        count,
        amount: Number(amount._sum.totalAmount || 0),
      });
    }
    return results;
  }

  async getEarningsSummary() {
    const earnings = await this.prisma.earning.groupBy({
      by: ['role'],
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const totalPaid = await this.prisma.withdrawal.aggregate({
      where: { status: { in: ['approved', 'paid'] } },
      _sum: { amount: true },
    });

    const totalPending = await this.prisma.withdrawal.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
    });

    return {
      byRole: earnings.map(e => ({ role: e.role, total: Number(e._sum.amount || 0) })),
      totalPaid: Number(totalPaid._sum.amount || 0),
      totalPending: Number(totalPending._sum.amount || 0),
    };
  }

  async getLowStock() {
    const products = await this.prisma.product.findMany({
      where: { status: 1 },
      select: { id: true, name: true, stock: true, minStock: true, unit: true },
    });
    return products.filter((p) => (p.stock || 0) <= (p.minStock || 10));
  }
}
