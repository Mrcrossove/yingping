import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WithdrawalService {
  constructor(private prisma: PrismaService) {}

  async apply(userId: number, dto: { amount: number; accountType: string; accountInfo: string }) {
    const pending = await this.prisma.earning.aggregate({
      where: { userId, status: 'pending_settle' },
      _sum: { amount: true },
    });
    const pendingAmount = Number(pending._sum.amount || 0);

    const approvedWithdrawals = await this.prisma.withdrawal.aggregate({
      where: { userId, status: 'approved' },
      _sum: { amount: true },
    });
    const withdrawnAmount = Number(approvedWithdrawals._sum.amount || 0);

    const available = pendingAmount - withdrawnAmount;
    if (available <= 0) throw new BadRequestException('没有可提现金额');
    if (dto.amount > available) throw new BadRequestException(`可提现金额为 ${available}`);

    return this.prisma.withdrawal.create({
      data: {
        userId,
        amount: dto.amount,
        accountType: dto.accountType,
        accountInfo: dto.accountInfo,
        status: 'pending',
      },
    });
  }

  async findAll(query: { page?: number; pageSize?: number; userId?: number; status?: string }) {
    const { page = 1, pageSize = 20, userId, status } = query;
    const where: any = {};
    if (userId) where.userId = +userId;
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, realName: true, role: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async approve(id: number) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new BadRequestException('申请不存在');
    if (withdrawal.status !== 'pending') throw new BadRequestException('申请已处理');

    const result = await this.prisma.withdrawal.update({
      where: { id },
      data: { status: 'approved', processedAt: new Date() },
    });

    // 将对应的收益状态改为已提现
    await this.prisma.earning.updateMany({
      where: { userId: withdrawal.userId, status: 'pending_settle' },
      data: { status: 'withdrawn' },
    });

    return result;
  }

  async reject(id: number, remark: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new BadRequestException('申请不存在');

    return this.prisma.withdrawal.update({
      where: { id },
      data: { status: 'rejected', remark, processedAt: new Date() },
    });
  }

  async findMyWithdrawals(userId: number, query: { page?: number; pageSize?: number }) {
    return this.findAll({ ...query, userId });
  }
  async markPaid(id: number) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new BadRequestException('申请不存在');
    if (withdrawal.status !== 'approved') throw new BadRequestException('只能标记已通过的申请为已打款');

    return this.prisma.withdrawal.update({
      where: { id },
      data: { status: 'paid', processedAt: new Date() },
    });
  }

}
