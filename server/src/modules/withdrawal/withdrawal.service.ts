import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class WithdrawalService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async apply(userId: number, dto: { amount: number; accountType: string; accountInfo: string }) {
    const amount = new Prisma.Decimal(dto.amount || 0);
    if (amount.lessThanOrEqualTo(0)) throw new BadRequestException('提现金额必须大于 0');
    if (!dto.accountType || !dto.accountInfo) throw new BadRequestException('提现账户信息不完整');

    const available = await this.getAvailableAmount(userId);
    if (available <= 0) throw new BadRequestException('没有可提现金额');
    if (amount.greaterThan(available)) throw new BadRequestException(`可提现金额为 ${available}`);

    const withdrawal = await this.prisma.$transaction(async (tx) => {
      const earnings = await tx.earning.findMany({
        where: {
          userId,
          status: 'pending_settle',
          withdrawalItems: { none: {} },
        },
        orderBy: { createdAt: 'asc' },
      });

      const selected = this.selectWholeEarningItems(earnings, amount);
      if (selected.length === 0) {
        throw new BadRequestException('提现金额需等于一笔或多笔可提现收益之和，请按收益明细金额申请');
      }

      const created = await tx.withdrawal.create({
        data: {
          userId,
          amount,
          accountType: dto.accountType,
          accountInfo: dto.accountInfo,
          status: 'pending',
        },
      });

      await tx.withdrawalItem.createMany({
        data: selected.map((item) => ({
          withdrawalId: created.id,
          earningId: item.earningId,
          userId,
          amount: item.amount,
        })),
      });

      return created;
    });
    await this.safeNotifyRoles(['boss', 'admin'], {
      title: '有新的提现申请',
      content: `用户提交提现申请 ¥${Number(amount).toFixed(2)}`,
      type: 'withdrawal',
    });
    return withdrawal;
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
    await this.safeNotifyUsers([withdrawal.userId], {
      title: '提现申请已通过',
      content: `提现 ¥${Number(withdrawal.amount).toFixed(2)} 已审核通过`,
      type: 'withdrawal',
    });

    return result;
  }

  async reject(id: number, remark: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new BadRequestException('申请不存在');
    if (withdrawal.status !== 'pending') throw new BadRequestException('只能拒绝待审核申请');

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawal.update({
        where: { id },
        data: { status: 'rejected', remark, processedAt: new Date() },
      });
      await tx.withdrawalItem.deleteMany({ where: { withdrawalId: id } });
      return updated;
    });
    await this.safeNotifyUsers([withdrawal.userId], {
      title: '提现申请已拒绝',
      content: remark || `提现 ¥${Number(withdrawal.amount).toFixed(2)} 已被拒绝`,
      type: 'withdrawal',
    });
    return result;
  }

  async findMyWithdrawals(userId: number, query: { page?: number; pageSize?: number }) {
    return this.findAll({ ...query, userId });
  }
  async markPaid(id: number) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new BadRequestException('申请不存在');
    if (withdrawal.status !== 'approved') throw new BadRequestException('只能标记已通过的申请为已打款');

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawal.update({
        where: { id },
        data: { status: 'paid', processedAt: new Date() },
      });
      const items = await tx.withdrawalItem.findMany({ where: { withdrawalId: id }, select: { earningId: true } });
      if (items.length > 0) {
        await tx.earning.updateMany({
          where: { id: { in: items.map((item) => item.earningId) } },
          data: { status: 'withdrawn' },
        });
      }
      return updated;
    });
    await this.safeNotifyUsers([withdrawal.userId], {
      title: '提现已打款',
      content: `提现 ¥${Number(withdrawal.amount).toFixed(2)} 已标记打款`,
      type: 'withdrawal',
    });
    return result;
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
      where: { userId, status: 'pending_settle', withdrawalItems: { none: {} } },
      _sum: { amount: true },
    });

    const earningAmount = Number(earnings._sum.amount || 0);
    return Math.max(0, earningAmount);
  }

  private selectWholeEarningItems(
    earnings: { id: number; amount: Prisma.Decimal }[],
    targetAmount: Prisma.Decimal,
  ) {
    const targetCents = this.toCents(targetAmount);
    if (targetCents <= 0) return [];

    const dp = new Map<number, number[]>();
    dp.set(0, []);

    earnings.forEach((earning, index) => {
      const cents = this.toCents(earning.amount);
      if (cents <= 0 || cents > targetCents) return;

      for (const [sum, indexes] of Array.from(dp.entries())) {
        const next = sum + cents;
        if (next > targetCents || dp.has(next)) continue;
        dp.set(next, [...indexes, index]);
      }
    });

    const matchedIndexes = dp.get(targetCents);
    if (!matchedIndexes) return [];

    return matchedIndexes.map((index) => ({
      earningId: earnings[index].id,
      amount: earnings[index].amount,
    }));
  }

  private toCents(value: Prisma.Decimal) {
    return Math.round(Number(value) * 100);
  }

  private async safeNotifyRoles(roles: string[], data: { title: string; content?: string; type?: string }) {
    try { await this.notificationService.createForRoles(roles, data); } catch {}
  }

  private async safeNotifyUsers(userIds: number[], data: { title: string; content?: string; type?: string }) {
    try { await this.notificationService.createForUsers(userIds, data); } catch {}
  }
}
