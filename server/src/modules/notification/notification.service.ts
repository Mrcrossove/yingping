import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(data: { userId: number; title: string; content?: string; type?: string }) {
    return this.prisma.notification.create({ data });
  }

  async findByUser(userId: number, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;
    const where = { userId };
    const [list, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip: (page - 1) * pageSize, take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { list, total, unreadCount, page, pageSize };
  }

  async markRead(id: number) {
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }
}
