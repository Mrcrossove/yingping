import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

type DispatchOperator = { id: number; role: Role };

@Injectable()
export class DispatchService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async autoAssignDelivery(orderId: number, operator: DispatchOperator) {
    const candidate = await this.pickLeastLoadedDelivery();
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNo: true, status: true, deliveryId: true },
    });
    if (!order || order.deliveryId || order.status !== 'made') return null;

    if (!candidate) {
      await this.safeNotifyRoles(['boss', 'admin'], {
        title: '自动派单失败',
        content: `订单 ${order.orderNo} 暂无可用配送员，请人工派单`,
        type: 'order',
        targetPath: `/orders/${order.id}`,
      });
      return null;
    }

    const assigned = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: orderId, status: 'made', deliveryId: null },
        data: { deliveryId: candidate.id },
      });
      if (changed.count !== 1) return null;

      await tx.orderFlow.create({
        data: {
          orderId,
          fromRole: operator.role,
          toRole: 'delivery',
          operatorId: operator.id,
          action: '自动派单给配送员',
          remark: '系统按当前任务数最少自动分配',
        },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          delivery: { select: { id: true, realName: true, phone: true } },
        },
      });
    });

    if (assigned) {
      await this.safeNotifyUsers([candidate.id], {
        title: '你有新的配送任务',
        content: `订单 ${order.orderNo} 已自动派单给你配送`,
        type: 'order',
        targetPath: `/orders/${order.id}`,
      });
    }

    return assigned;
  }

  private async pickLeastLoadedDelivery() {
    const deliveryUsers = await this.prisma.user.findMany({
      where: { role: 'delivery', status: 1 },
      select: { id: true, realName: true, phone: true },
      orderBy: { id: 'asc' },
    });
    if (deliveryUsers.length === 0) return null;

    const activeCounts = await this.prisma.order.groupBy({
      by: ['deliveryId'],
      where: {
        deliveryId: { in: deliveryUsers.map((user) => user.id) },
        status: { in: ['made', 'delivering'] },
      },
      _count: { _all: true },
    });

    const countByDeliveryId = new Map<number, number>();
    activeCounts.forEach((item) => {
      if (item.deliveryId) countByDeliveryId.set(item.deliveryId, item._count._all);
    });

    return deliveryUsers
      .map((user) => ({ ...user, activeCount: countByDeliveryId.get(user.id) || 0 }))
      .sort((a, b) => a.activeCount - b.activeCount || a.id - b.id)[0];
  }

  private async safeNotifyRoles(roles: string[], data: { title: string; content?: string; type?: string; targetPath?: string }) {
    try { await this.notificationService.createForRoles(roles, data); } catch {}
  }

  private async safeNotifyUsers(userIds: number[], data: { title: string; content?: string; type?: string; targetPath?: string }) {
    try { await this.notificationService.createForUsers(userIds, data); } catch {}
  }
}
