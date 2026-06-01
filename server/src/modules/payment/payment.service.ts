import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { Role } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async createPayment(orderId: number, user: { id: number; role: Role }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new BadRequestException('订单不存在');
    this.assertCanAccessOrder(order, user);
    if (order.payment) throw new BadRequestException('已有支付记录');

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        orderNo: order.orderNo,
        userId: user.id,
        amount: order.totalAmount,
        status: 'pending',
      },
    });
    return payment;
  }

  async jsapiPay(orderId: number, openid: string, user: { id: number; role: Role }) {
    if (!openid) throw new BadRequestException('缺少 openid');
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });
    if (!payment) throw new BadRequestException('支付记录不存在');
    this.assertCanAccessOrder(payment.order, user);
    if (payment.status !== 'pending') throw new BadRequestException('订单已支付');

    const wxConfig = this.getWxPayConfig();
    const totalFee = Math.round(Number(payment.amount) * 100);
    if (totalFee <= 0) throw new BadRequestException('支付金额不正确');

    const body = {
      appid: wxConfig.appId,
      mchid: wxConfig.mchId,
      description: `订单 ${payment.orderNo}`,
      out_trade_no: payment.orderNo,
      notify_url: wxConfig.notifyUrl,
      amount: { total: totalFee, currency: 'CNY' },
      payer: { openid },
    };

    const response = await axios.post('https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi', body, {
      headers: {
        Authorization: this.buildWechatAuthorization('POST', '/v3/pay/transactions/jsapi', body, wxConfig),
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'beverage-order-server/1.0',
      },
      timeout: 15000,
    });
    const prepayId = response.data?.prepay_id;
    if (!prepayId) throw new BadRequestException('微信预支付单创建失败');

    const timeStamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    const payPackage = `prepay_id=${prepayId}`;

    const params = {
      appId: wxConfig.appId,
      timeStamp,
      nonceStr,
      package: payPackage,
      signType: 'RSA',
      paySign: this.signWithPrivateKey(`${wxConfig.appId}\n${timeStamp}\n${nonceStr}\n${payPackage}\n`, wxConfig.privateKey),
    };

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { prepayId },
    });

    return params;
  }

  async handlePayNotify(orderNo: string, transactionId: string, signature: string) {
    this.verifyInternalNotifySignature(orderNo, transactionId, signature);
    const payment = await this.prisma.payment.findFirst({ where: { orderNo } });
    if (!payment) throw new BadRequestException('支付记录不存在');
    if (payment.status === 'paid') return { success: true };
    if (payment.status !== 'pending') throw new BadRequestException('支付状态不允许更新');

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId, status: 'paid', paidAt: new Date() },
    });
    return { success: true };
  }

  async getPaymentByOrder(orderId: number, user: { id: number; role: Role }) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });
    if (!payment) return null;
    this.assertCanAccessOrder(payment.order, user);
    const { order, ...data } = payment;
    return data;
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

  private assertCanAccessOrder(order: any, user: { id: number; role: Role }) {
    if (user.role === 'boss' || user.role === 'admin') return;
    if (user.role === 'merchant' && order.merchantId === user.id) return;
    if (user.role === 'salesperson' && order.salespersonId === user.id) return;
    throw new ForbiddenException('无权访问该支付订单');
  }

  private getWxPayConfig() {
    const appId = process.env.WX_APPID;
    const mchId = process.env.WX_MCH_ID;
    const serialNo = process.env.WX_SERIAL_NO;
    const privateKeyPath = process.env.WX_PRIVATE_KEY_PATH;
    const notifyUrl = process.env.WX_PAY_NOTIFY_URL;
    if (!appId || !mchId || !serialNo || !privateKeyPath || !notifyUrl) {
      throw new BadRequestException('微信支付参数未配置完整');
    }
    return {
      appId,
      mchId,
      serialNo,
      notifyUrl,
      privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
    };
  }

  private buildWechatAuthorization(method: string, urlPath: string, body: any, config: ReturnType<PaymentService['getWxPayConfig']>) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const bodyText = JSON.stringify(body);
    const signature = this.signWithPrivateKey(`${method}\n${urlPath}\n${timestamp}\n${nonce}\n${bodyText}\n`, config.privateKey);
    return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`;
  }

  private signWithPrivateKey(message: string, privateKey: string) {
    return crypto.createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');
  }

  private verifyInternalNotifySignature(orderNo: string, transactionId: string, signature: string) {
    const secret = process.env.PAYMENT_NOTIFY_SECRET;
    if (!secret) throw new BadRequestException('支付回调密钥未配置');
    if (!orderNo || !transactionId || !signature) throw new BadRequestException('支付回调参数不完整');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderNo}.${transactionId}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      throw new ForbiddenException('支付回调签名无效');
    }
  }
}
