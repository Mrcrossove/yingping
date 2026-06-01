import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    userId?: number; username?: string; role?: string;
    action: string; resource?: string; resourceId?: number;
    detail?: string; ip?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async findAll(query: { page?: number; pageSize?: number; userId?: number; action?: string }) {
    const { page = 1, pageSize = 20, userId, action } = query;
    const where: any = {};
    if (userId) where.userId = +userId;
    if (action) where.action = action;
    const [list, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, skip: (page - 1) * pageSize, take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }
}
