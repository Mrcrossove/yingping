import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WithdrawalService {
  constructor(private prisma: PrismaService) {}

  async apply(userId: number, dto: { amount: number; accountType: string; accountInfo: string }) {
    const amount = new Prisma.Decimal(dto.amount || 0);
    if (amount.lessThanOrEqualTo(0)) throw new BadRequestException('提现金额必须大于 0');
    if (!dto.accountType || !dto.accountInfo) throw new BadRequestException('提现账户信息不完整');

    const available = await this.getAvailableAmount(userId);
    if (available <= 0) throw new BadRequestException('没有可提现金额');
    if (amount.greaterThan(available)) throw new BadRequestException(`可提现金额为 ${available}`);

    return this.prisma.withdrawal.create({
      data: {
        userId,
        amount,
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
        take: +pageSize,
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

    return result;
  }

  async reject(id: number, remark: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new BadRequestException('申请不存在');
    if (withdrawal.status !== 'pending') throw new BadRequestException('只能拒绝待审核申请');

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

  async batchApprove(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) throw new BadRequestException('请选择提现申请');
    return this.prisma.withdrawal.updateMany({
      where: { id: { in: ids }, status: 'pending' },
      data: { status: 'approved', processedAt: new Date() },
    });
  }

  private async getAvailableAmount(userId: number) {
    const earnings = await this.prisma.earning.aggregate({
      where: { userId, status: 'pending_settle' },
      _sum: { amount: true },
    });
    const withdrawals = await this.prisma.withdrawal.aggregate({
      where: { userId, status: { in: ['pending', 'approved', 'paid'] } },
      _sum: { amount: true },
    });

    const earningAmount = Number(earnings._sum.amount || 0);
    const occupiedAmount = Number(withdrawals._sum.amount || 0);
    return Math.max(0, earningAmount - occupiedAmount);
  }
}
