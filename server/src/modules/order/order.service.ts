import { Injectable, NotFoundException, ForbiddenException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WebsocketGateway))
    private wsGateway: WebsocketGateway,
    private notificationService: NotificationService,
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
  }, merchantId: number) {
    if (!dto.items?.length) throw new BadRequestException('订单商品不能为空');
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
          status: 'pending',
          items: {
            create: items,
          },
          flows: {
            create: {
              fromRole: 'merchant',
              toRole: 'salesperson',
              operatorId: merchantId,
              action: '商户下单',
            },
          },
        },
        include: { items: { include: { product: true } }, flows: true },
      });
    });

    await this.safeNotifyRoles(['boss', 'admin', 'salesperson'], {
      title: '有新的订单待接单',
      content: `订单 ${order.orderNo} 金额 ¥${Number(order.totalAmount).toFixed(2)}`,
      type: 'order',
    });

    return order;
  }

  async findAll(query: {
    page?: number; pageSize?: number; status?: OrderStatus;
    merchantId?: number; salespersonId?: number; makerId?: number; deliveryId?: number;
    keyword?: string; startDate?: string; endDate?: string;
  }) {
    const { page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.merchantId) where.merchantId = +query.merchantId;
    if (query.salespersonId) where.salespersonId = +query.salespersonId;
    if (query.makerId) where.makerId = +query.makerId;
    if (query.deliveryId) where.deliveryId = +query.deliveryId;
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

  async acceptOrder(orderId: number, salespersonId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'pending') throw new BadRequestException('订单状态不正确');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        salespersonId,
        status: 'accepted',
        flows: {
          create: {
            fromRole: 'merchant',
            toRole: 'salesperson',
            operatorId: salespersonId,
            action: '业务员接单',
          },
        },
      },
    });
    await this.safeNotifyUsers([order.merchantId], {
      title: '订单已接单',
      content: `订单 ${order.orderNo} 已由业务员接单`,
      type: 'order',
    });
    return updated;
  }

  async dispatchToMaker(orderId: number, makerId: number, operatorId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'accepted') throw new BadRequestException('订单状态不正确，当前只能从已接单状态派单给制作员');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        makerId,
        status: 'making',
        flows: {
          create: {
            fromRole: 'salesperson',
            toRole: 'maker',
            operatorId,
            action: '派单给制作员',
          },
        },
      },
    });
    await this.safeNotifyUsers([makerId], {
      title: '你有新的制作任务',
      content: `订单 ${order.orderNo} 已派单给你制作`,
      type: 'order',
    });
    return updated;
  }


  async dispatchBoth(orderId: number, makerId: number, deliveryId: number, operatorId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'accepted') throw new BadRequestException('订单状态不正确');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        makerId,
        deliveryId,
        status: 'making',
        flows: {
          create: [
            {
              fromRole: 'salesperson',
              toRole: 'maker',
              operatorId,
              action: '派单给制作员',
            },
            {
              fromRole: 'salesperson',
              toRole: 'delivery',
              operatorId,
              action: '派单给配送员',
            },
          ],
        },
      },
    });

    this.wsGateway.notifyNewTask(makerId, { orderId, type: 'making' });
    this.wsGateway.notifyNewTask(deliveryId, { orderId, type: 'waiting' });
    await this.safeNotifyUsers([makerId, deliveryId], {
      title: '你有新的订单任务',
      content: `订单 ${order.orderNo} 已派单，请及时处理`,
      type: 'order',
    });

    return updated;
  }


  async makerStartMaking(orderId: number, makerId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'making') throw new BadRequestException('订单状态不正确');
    if (order.makerId !== makerId) throw new ForbiddenException('无权操作该制作任务');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        flows: {
          create: {
            fromRole: 'maker',
            toRole: 'maker',
            operatorId: makerId,
            action: '开始制作',
          },
        },
      },
    });

    this.wsGateway.notifyOrderStatusChange(orderId, 'making', '制作员已开始制作');

    return updated;
  }

  async makerComplete(orderId: number, makerId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'making') throw new BadRequestException('订单状态不正确');
    if (order.makerId !== makerId) throw new ForbiddenException('无权操作该制作任务');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'made',
        flows: {
          create: {
            fromRole: 'maker',
            toRole: 'salesperson',
            operatorId: makerId,
            action: '制作完成',
          },
        },
      },
    });

    this.wsGateway.notifyOrderStatusChange(orderId, 'made', '制作已完成，等待配送');
    await this.safeNotifyUsers([order.salespersonId || 0, order.deliveryId || 0], {
      title: '订单制作完成',
      content: `订单 ${order.orderNo} 已制作完成`,
      type: 'order',
    });
    return updated;
  }


  async deliveryStartDelivering(orderId: number, deliveryId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'made') throw new BadRequestException('订单状态不正确，请等待制作完成');
    if (order.deliveryId !== deliveryId) throw new ForbiddenException('无权操作该配送任务');

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

  async dispatchToDelivery(orderId: number, deliveryId: number, operatorId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'made') throw new BadRequestException('订单状态不正确，需制作完成后才能派单给配送员');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryId,
        status: 'delivering',
        flows: {
          create: {
            fromRole: 'salesperson',
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
    });

    await this.calculateCommissions(orderId);
    this.wsGateway.notifyOrderStatusChange(orderId, 'completed', '订单已完成，收益已结算');
    if (updated) {
      await this.safeNotifyUsers([updated.merchantId], {
        title: '订单已送达',
        content: `订单 ${updated.orderNo} 已配送完成`,
        type: 'order',
      });
    }

    return updated;
  }

  async cancel(orderId: number, user: { id: number; role: Role }) {
    const order = await this.findOne(orderId);
    if (!this.canAccessOrder(order, user)) throw new ForbiddenException('无权取消该订单');
    if (order.status === 'delivered' || order.status === 'completed') throw new BadRequestException('已完成的订单无法取消');
    const paymentStatus = order.payment?.status;
    if (paymentStatus && ['paid', 'refunding', 'refunded'].includes(paymentStatus)) {
      throw new BadRequestException('已支付订单不能直接取消，请申请退款');
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
    });
  }

  async manualCreate(dto: {
    items: { productId: number; quantity: number }[];
    note?: string;
    merchantId: number;
    receiverName?: string;
    receiverPhone?: string;
    receiverAddress?: string;
    receiverLocationName?: string;
    receiverLatitude?: number;
    receiverLongitude?: number;
    receiverAdcode?: string;
  }, salespersonId: number) {
    const merchant = await this.prisma.user.findUnique({ where: { id: +dto.merchantId } });
    if (!merchant || merchant.role !== 'merchant' || merchant.status !== 1) {
      throw new BadRequestException('商户不存在或不可下单');
    }
    const order = await this.create(dto, dto.merchantId);
    await this.acceptOrder(order.id, salespersonId);
    return this.findOne(order.id);
  }

  async batchDispatch(orderIds: number[], makerId: number, deliveryId: number, operatorId: number) {
    const results: { id: number; success: boolean; message?: string }[] = [];
    for (const id of orderIds) {
      try {
        const result = await this.dispatchBoth(id, makerId, deliveryId, operatorId);
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
        if (rule.role === 'salesperson') userId = order.salespersonId || 0;
        else if (rule.role === 'maker') userId = order.makerId || 0;
        else if (rule.role === 'delivery') userId = order.deliveryId || 0;
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

  private async safeNotifyRoles(roles: string[], data: { title: string; content?: string; type?: string }) {
    try { await this.notificationService.createForRoles(roles, data); } catch {}
  }

  private async safeNotifyUsers(userIds: number[], data: { title: string; content?: string; type?: string }) {
    try { await this.notificationService.createForUsers(userIds, data); } catch {}
  }

  private canAccessOrder(order: any, user: { id: number; role: Role }) {
    if (user.role === 'boss' || user.role === 'admin') return true;
    if (user.role === 'merchant') return order.merchantId === user.id;
    if (user.role === 'salesperson') return order.salespersonId === user.id;
    if (user.role === 'maker') return order.makerId === user.id;
    if (user.role === 'delivery') return order.deliveryId === user.id;
    return false;
  }
}
