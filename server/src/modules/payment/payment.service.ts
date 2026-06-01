import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async createPayment(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new BadRequestException('订单不存在');
    if (order.payment) throw new BadRequestException('已有支付记录');

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        orderNo: order.orderNo,
        userId,
        amount: order.totalAmount,
        status: 'pending',
      },
    });
    return payment;
  }

  async jsapiPay(orderId: number, openid: string) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new BadRequestException('支付记录不存在');
    if (payment.status !== 'pending') throw new BadRequestException('订单已支付');

    const totalFee = Math.round(Number(payment.amount) * 100);
    const prepayId = `prepay_${Date.now()}`;

    const params = {
      appId: process.env.WX_APPID || 'wx_placeholder',
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: crypto.randomUUID().replace(/-/g, '').slice(0, 32),
      package: `prepay_id=${prepayId}`,
      signType: 'RSA',
      paySign: 'MOCK_SIGN_PLACEHOLDER',
    };

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { prepayId },
    });

    return params;
  }

  async handlePayNotify(orderNo: string, transactionId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { orderNo } });
    if (!payment) throw new BadRequestException('支付记录不存在');

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId, status: 'paid', paidAt: new Date() },
    });
    return { success: true };
  }

  async getPaymentByOrder(orderId: number) {
    return this.prisma.payment.findUnique({ where: { orderId } });
  }

  async getPayments(query: { page?: number; pageSize?: number; status?: string }) {
    const { page = 1, pageSize = 20, status } = query;
    const where: any = {};
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.payment.findMany({
        where, skip: (page - 1) * pageSize, take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async refund(orderId: number) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new BadRequestException('支付记录不存在');
    if (payment.status !== 'paid') throw new BadRequestException('只能退款已支付的订单');

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'refunded' },
    });
    return { success: true };
  }
}
