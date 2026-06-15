import { Injectable, NotFoundException, ForbiddenException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderSettlementType, OrderStatus, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { NotificationService } from '../notification/notification.service';
import { PaymentService } from '../payment/payment.service';
import { DispatchService } from '../dispatch/dispatch.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WebsocketGateway))
    private wsGateway: WebsocketGateway,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    private dispatchService: DispatchService,
  ) {}

  async create(dto: {
    items: { productId: number; quantity: number }[];
    note?: string;
    addressId?: number;
    receiverName?: string;
    receiverPhone?: string;
    receiverAddress?: string;
    receiverLocationName?: string;
    receiverLatitude?: number;
    receiverLongitude?: number;
    receiverAdcode?: string;
    settlementType?: OrderSettlementType;
  }, merchantId: number) {
    if (!dto.items?.length) throw new BadRequestException('订单商品不能为空');
    const settlementType = dto.settlementType === 'monthly' ? 'monthly' : 'wechat';
    const orderNo = this.generateOrderNo();
    const addressSnapshot = await this.resolveAddressSnapshot(dto, merchantId);

    const order = await this.prisma.$transaction(async (tx) => {
      let totalAmount = new Prisma.Decimal(0);
      const items: { productId: number; quantity: number; price: any }[] = [];
      let stockDeducted = false;

      for (const item of dto.items) {
        const productId = Number(item.productId);
        const quantity = Number(item.quantity);
        if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
          throw new BadRequestException(`商品 ${item.productId} 数量不正确`);
        }
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product || product.status === 0) {
          throw new BadRequestException(`商品 ${item.productId} 不存在或已下架`);
        }
        if (product.stock !== null && product.stock < quantity) {
          throw new BadRequestException(`${product.name} 库存不足`);
        }

        if (product.stock !== null) {
          const changed = await tx.product.updateMany({
            where: { id: productId, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          });
          if (changed.count !== 1) throw new BadRequestException(`${product.name} 库存不足`);
          stockDeducted = true;
        }

        items.push({ productId, quantity, price: product.price });
        totalAmount = totalAmount.add(product.price.mul(quantity));
      }

      return tx.order.create({
        data: {
          orderNo,
          merchantId,
          totalAmount,
          note: dto.note,
          ...addressSnapshot,
          stockDeducted,
          settlementType,
          settlementStatus: settlementType === 'monthly' ? 'monthly_pending' : 'unpaid',
          status: settlementType === 'monthly' ? 'made' : 'pending',
          items: {
            create: items,
          },
          flows: {
            create: settlementType === 'monthly'
              ? [
                  {
                    fromRole: 'merchant',
                    toRole: 'admin',
                    operatorId: merchantId,
                    action: '商户月结下单',
                  },
                  {
                    fromRole: 'merchant',
                    toRole: 'admin',
                    operatorId: merchantId,
                    action: '系统确认订单',
                    remark: '月结订单创建后自动进入待配送',
                  },
                ]
              : {
                  fromRole: 'merchant',
                  toRole: 'admin',
                  operatorId: merchantId,
                  action: '商户下单',
                },
          },
        },
        include: { items: { include: { product: true } }, flows: true },
      });
    });

    await this.safeNotifyRoles(['boss', 'admin'], {
      title: settlementType === 'monthly' ? '有新的月结订单待配送' : '有新的订单待支付',
      content: `订单 ${order.orderNo} 金额 ¥${Number(order.totalAmount).toFixed(2)}`,
      type: 'order',
      targetPath: `/orders/${order.id}`,
    });

    if (settlementType === 'monthly') {
      await this.dispatchService.autoAssignDelivery(order.id, { id: merchantId, role: 'merchant' });
    }

    return order;
  }

  async findAll(query: {
    page?: number; pageSize?: number; status?: OrderStatus;
    merchantId?: number; salespersonId?: number; makerId?: number; deliveryId?: number;
    keyword?: string; startDate?: string; endDate?: string; settlementType?: string; settlementStatus?: string;
  }) {
    const { page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.merchantId) where.merchantId = +query.merchantId;
    if (query.salespersonId) where.salespersonId = +query.salespersonId;
    if (query.makerId) where.makerId = +query.makerId;
    if (query.deliveryId) where.deliveryId = +query.deliveryId;
    if (query.settlementType) where.settlementType = query.settlementType;
    if (query.settlementStatus) where.settlementStatus = query.settlementStatus;
    if (query.keyword) where.orderNo = { contains: query.keyword };
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate + 'T23:59:59');
    }

    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        include: {
          items: { include: { product: true } },
          merchant: { select: { id: true, realName: true, phone: true } },
          salesperson: { select: { id: true, realName: true, phone: true } },
          maker: { select: { id: true, realName: true, phone: true } },
          delivery: { select: { id: true, realName: true, phone: true } },
          payment: true,
          flows: {
            include: { operator: { select: { id: true, realName: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        merchant: { select: { id: true, realName: true, phone: true } },
        salesperson: { select: { id: true, realName: true, phone: true } },
        maker: { select: { id: true, realName: true, phone: true } },
        delivery: { select: { id: true, realName: true, phone: true } },
        payment: true,
        flows: {
          include: { operator: { select: { id: true, realName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  async findOneForUser(id: number, user: { id: number; role: Role }) {
    const order = await this.findOne(id);
    if (!this.canAccessOrder(order, user)) {
      throw new ForbiddenException('无权访问该订单');
    }
    return order;
  }

  async deliveryStartDelivering(orderId: number, deliveryId: number) {
    const order = await this.findOne(orderId);
    if (!['making', 'made'].includes(order.status)) throw new BadRequestException('订单状态不正确，请等待派单配送');
    if (order.deliveryId !== deliveryId) throw new ForbiddenException('无权操作该配送任务');
    if (order.flows?.some((flow: any) => flow.action === '开始配送')) return order;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'delivering',
        flows: {
          create: {
            fromRole: 'delivery',
            toRole: 'merchant',
            operatorId: deliveryId,
            action: '开始配送',
          },
        },
      },
    });

    this.wsGateway.notifyOrderStatusChange(orderId, 'delivering', '配送员已取货出发');

    return updated;
  }

  async dispatchToDelivery(orderId: number, deliveryId: number, operator: { id: number; role: Role }) {
    const order = await this.findOne(orderId);
    if (!['accepted', 'making', 'made'].includes(order.status)) throw new BadRequestException('订单状态不正确，当前只能派发待配送订单');
    const operatorId = operator.id;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryId,
        status: 'made',
        flows: {
          create: {
            fromRole: operator.role,
            toRole: 'delivery',
            operatorId,
            action: '派单给配送员',
          },
        },
      },
    });
    await this.safeNotifyUsers([deliveryId], {
      title: '你有新的配送任务',
      content: `订单 ${order.orderNo} 已派单给你配送`,
      type: 'order',
      targetPath: `/orders/${order.id}`,
    });
    return updated;
  }

  async deliveryComplete(orderId: number, deliveryId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'delivering') throw new BadRequestException('订单状态不正确');
    if (order.deliveryId !== deliveryId) throw new ForbiddenException('无权操作该配送任务');

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: orderId, status: 'delivering', deliveryId },
        data: { status: 'completed' },
      });
      if (changed.count !== 1) throw new BadRequestException('订单状态已变更，请刷新后重试');

      await tx.orderFlow.create({
        data: {
          orderId,
          fromRole: 'delivery',
          toRole: 'merchant',
          operatorId: deliveryId,
          action: '配送完成已送达，订单完结',
        },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true } },
          merchant: { select: { id: true, realName: true, phone: true, merchantProfile: true } },
          salesperson: { select: { id: true, realName: true, phone: true } },
          maker: { select: { id: true, realName: true, phone: true } },
          delivery: { select: { id: true, realName: true, phone: true } },
          payment: true,
          flows: {
            include: { operator: { select: { id: true, realName: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    await this.calculateCommissions(orderId);
    this.wsGateway.notifyOrderStatusChange(orderId, 'completed', '订单已完成，收益已结算');
    if (updated) {
      await this.safeNotifyUsers([updated.merchantId], {
        title: '订单已送达',
        content: `订单 ${updated.orderNo} 已配送完成`,
        type: 'order',
        targetPath: `/orders/${updated.id}`,
      });
    }

    return updated;
  }

  async cancel(orderId: number, user: { id: number; role: Role }) {
    const syncedPayment = await this.paymentService.syncPaymentStatus(orderId, user);
    const order = await this.findOne(orderId);
    if (!this.canAccessOrder(order, user)) throw new ForbiddenException('无权取消该订单');
    if (order.status === 'delivered' || order.status === 'completed') throw new BadRequestException('已完成的订单无法取消');
    const paymentStatus = syncedPayment?.status || order.payment?.status;
    if (paymentStatus && ['paid', 'refunding', 'refunded'].includes(paymentStatus)) {
      if (paymentStatus === 'paid') {
        return this.paymentService.refund(orderId, user);
      }
      throw new BadRequestException('订单正在退款或已退款，请勿重复操作');
    }
    if (user.role === 'merchant' && order.status !== 'pending') throw new BadRequestException('订单已接单，无法自行取消');

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: orderId, status: { notIn: ['delivered', 'completed', 'cancelled'] } },
        data: { status: 'cancelled' },
      });
      if (changed.count !== 1) throw new BadRequestException('订单状态已变化，请刷新后重试');

      if (order.stockDeducted) {
        for (const item of order.items || []) {
          const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stock: true } });
          if (product?.stock !== null) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }

      if (order.payment?.status === 'pending') {
        await tx.payment.update({
          where: { orderId },
          data: { status: 'failed' },
        });
      }

      await tx.orderFlow.create({
        data: {
          orderId,
          fromRole: user.role,
          toRole: 'merchant',
          operatorId: user.id,
          action: '取消订单',
        },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true } },
          merchant: { select: { id: true, realName: true, phone: true, merchantProfile: true } },
          salesperson: { select: { id: true, realName: true, phone: true } },
          maker: { select: { id: true, realName: true, phone: true } },
          delivery: { select: { id: true, realName: true, phone: true } },
          payment: true,
          flows: {
            include: { operator: { select: { id: true, realName: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  }

  async batchDispatch(orderIds: number[], deliveryId: number, operator: { id: number; role: Role }) {
    const results: { id: number; success: boolean; message?: string }[] = [];
    for (const id of orderIds) {
      try {
        const result = await this.dispatchToDelivery(id, deliveryId, operator);
        results.push({ id, success: true });
      } catch (e: any) {
        results.push({ id, success: false, message: e.message });
      }
    }
    return results;
  }

  async getLowStockProducts() {
    return this.prisma.product.findMany({
      where: {
        status: 1,
        stock: { not: null },
        minStock: { not: null },
      },
    }).then((products) =>
      products.filter((p) => (p.stock || 0) <= (p.minStock || 10))
    );
  }

  private async calculateCommissions(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order || (order.status !== 'delivered' && order.status !== 'completed')) return;

    const existing = await this.prisma.earning.count({
      where: { orderId, type: 'commission' },
    });
    if (existing > 0) return;

    const productIds = order.items.map((item) => item.productId);
    const commissionRules = await this.prisma.commissionRule.findMany({
      where: { productId: { in: productIds } },
    });
    if (commissionRules.length === 0) return;

    for (const item of order.items) {
      const product = item.product;
      const productRules = commissionRules.filter((r) => r.productId === product.id);

      for (const rule of productRules) {
        const amount = rule.type === 'fixed'
          ? rule.value.mul(item.quantity)
          : item.price.mul(item.quantity).mul(rule.value).div(100);
        if (amount.lessThanOrEqualTo(0)) continue;

        let userId = 0;
        if (rule.role === 'delivery') userId = order.deliveryId || 0;
        else if (rule.role === 'promoter') {
          const binding = await this.prisma.merchantBinding.findUnique({ where: { merchantId: order.merchantId } });
          if (binding) userId = binding.promoterId;
        }
        if (userId === 0) continue;

        await this.prisma.earning.create({
          data: {
            userId,
            orderId: order.id,
            orderNo: order.orderNo,
            amount,
            role: rule.role,
            type: 'commission',
            status: 'pending_settle',
          },
        });
      }
    }
  }

  private generateOrderNo(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BO${date}${random}`;
  }

  private async resolveAddressSnapshot(dto: {
    addressId?: number;
    receiverName?: string;
    receiverPhone?: string;
    receiverAddress?: string;
    receiverLocationName?: string;
    receiverLatitude?: number;
    receiverLongitude?: number;
    receiverAdcode?: string;
  }, merchantId: number) {
    if (dto.addressId) {
      const address = await this.prisma.address.findUnique({ where: { id: +dto.addressId } });
      if (!address || address.userId !== merchantId) throw new BadRequestException('收货地址不存在');
      return {
        addressId: address.id,
        receiverName: address.name,
        receiverPhone: address.phone,
        receiverAddress: this.formatAddress(address),
        receiverLocationName: address.locationName,
        receiverLatitude: address.latitude,
        receiverLongitude: address.longitude,
        receiverAdcode: address.adcode,
      };
    }

    if (dto.receiverName || dto.receiverPhone || dto.receiverAddress) {
      if (!dto.receiverName || !dto.receiverPhone || !dto.receiverAddress) {
        throw new BadRequestException('收货信息不完整');
      }
      return {
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        receiverAddress: dto.receiverAddress,
        receiverLocationName: dto.receiverLocationName,
        receiverLatitude: dto.receiverLatitude,
        receiverLongitude: dto.receiverLongitude,
        receiverAdcode: dto.receiverAdcode,
      };
    }

    return {};
  }

  private formatAddress(address: any) {
    return [address.province, address.city, address.district, address.detail].filter(Boolean).join('');
  }

  private async safeNotifyRoles(roles: string[], data: { title: string; content?: string; type?: string; targetPath?: string }) {
    try { await this.notificationService.createForRoles(roles, data); } catch {}
  }

  private async safeNotifyUsers(userIds: number[], data: { title: string; content?: string; type?: string; targetPath?: string }) {
    try { await this.notificationService.createForUsers(userIds, data); } catch {}
  }

  private canAccessOrder(order: any, user: { id: number; role: Role }) {
    if (user.role === 'boss' || user.role === 'admin') return true;
    if (user.role === 'merchant') return order.merchantId === user.id;
    if (user.role === 'delivery') return order.deliveryId === user.id;
    return false;
  }
}
