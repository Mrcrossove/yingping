import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(orderId: number, userId: number, data: { rating: number; content?: string }) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('订单不存在');
    if (order.status !== 'completed' && order.status !== 'delivered') {
      throw new BadRequestException('只能评价已完成的订单');
    }
    const exists = await this.prisma.review.findFirst({ where: { orderId, userId } });
    if (exists) throw new BadRequestException('已评价过此订单');

    return this.prisma.review.create({
      data: { orderId, userId, rating: data.rating, content: data.content },
    });
  }

  async findByOrder(orderId: number) {
    return this.prisma.review.findMany({
      where: { orderId },
      include: { order: { select: { orderNo: true } } },
    });
  }

  async findByUser(userId: number, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;
    const where = { userId };
    const [list, total] = await Promise.all([
      this.prisma.review.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNo: true } } },
      }),
      this.prisma.review.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }
}
