import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.commissionRule.findMany({
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async setRule(categoryId: number, role: string, percentage: number) {
    return this.prisma.commissionRule.upsert({
      where: { categoryId_role: { categoryId, role: role as any } },
      update: { percentage },
      create: { categoryId, role: role as any, percentage },
    });
  }

  async deleteRule(id: number) {
    return this.prisma.commissionRule.delete({ where: { id } });
  }
}
