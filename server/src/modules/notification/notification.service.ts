import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(data: { userId: number; title: string; content?: string; type?: string }) {
    return this.prisma.notification.create({ data });
  }

  async createForRoles(roles: string[], data: { title: string; content?: string; type?: string }) {
    const users = await this.prisma.user.findMany({
      where: { role: { in: roles as any }, status: 1 },
      select: { id: true },
    });
    if (users.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title: data.title,
        content: data.content,
        type: data.type || 'system',
      })),
    });
  }

  async createForUsers(userIds: number[], data: { title: string; content?: string; type?: string }) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (ids.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        title: data.title,
        content: data.content,
        type: data.type || 'system',
      })),
    });
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
