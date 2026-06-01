import { Injectable, NotFoundException, ForbiddenException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WebsocketGateway))
    private wsGateway: WebsocketGateway,
  ) {}

  async create(dto: { items: { productId: number; quantity: number }[]; note?: string }, merchantId: number) {
    const orderNo = this.generateOrderNo();

    let totalAmount = new Prisma.Decimal(0);
    const items: { productId: number; quantity: number; price: any }[] = [];
    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.status === 0) {
        throw new BadRequestException(`商品 ${item.productId} 不存在或已下架`);
      }
      items.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });
      totalAmount = totalAmount.add(product.price.mul(item.quantity));
    }

    const order = await this.prisma.order.create({
      data: {
        orderNo,
        merchantId,
        totalAmount,
        note: dto.note,
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
        take: pageSize,
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
        flows: {
          include: { operator: { select: { id: true, realName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
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

    return updated;
  }


  async makerStartMaking(orderId: number, makerId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'making') throw new BadRequestException('订单状态不正确');

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
    return updated;
  }


  async deliveryStartDelivering(orderId: number, deliveryId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'made') throw new BadRequestException('订单状态不正确，请等待制作完成');

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
    return updated;
  }

  async deliveryComplete(orderId: number, deliveryId: number) {
    const order = await this.findOne(orderId);
    if (order.status !== 'delivering') throw new BadRequestException('订单状态不正确');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'completed',
        flows: {
          create: {
            fromRole: 'delivery',
            toRole: 'merchant',
            operatorId: deliveryId,
            action: '配送完成已送达，订单完结',
          },
        },
      },
    });

    await this.calculateCommissions(orderId);
    this.wsGateway.notifyOrderStatusChange(orderId, 'completed', '订单已完成，收益已结算');

    return updated;
  }

  async cancel(orderId: number, operatorId: number) {
    const order = await this.findOne(orderId);
    if (order.status === 'delivered' || order.status === 'completed') throw new BadRequestException('已完成的订单无法取消');

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        flows: {
          create: {
            fromRole: 'admin',
            toRole: 'merchant',
            operatorId,
            action: '取消订单',
          },
        },
      },
    });
  }

  async manualCreate(dto: {
    items: { productId: number; quantity: number }[];
    note?: string;
    merchantId: number;
  }, salespersonId: number) {
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

    const commissionRules = await this.prisma.commissionRule.findMany();
    if (commissionRules.length === 0) return;

    for (const item of order.items) {
      const product = item.product;
      const categoryRules = commissionRules.filter((r) => r.categoryId === product.categoryId);

      for (const rule of categoryRules) {
        const amount = product.price.mul(item.quantity).mul(rule.percentage).div(100);
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
}
