import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { PaymentStatus, Role } from '@prisma/client';

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

  async handlePayNotify(body: any, headers: { rawBody?: Buffer; timestamp?: string; nonce?: string; signature?: string; serial?: string }) {
    this.verifyWechatNotifySignature(headers);
    const resource = body?.resource;
    if (!resource?.ciphertext || !resource?.nonce || !resource?.associated_data) {
      throw new BadRequestException('支付回调参数不完整');
    }

    const data = this.decryptWechatResource(resource);
    if (data.trade_state !== 'SUCCESS') return { code: 'SUCCESS', message: '成功' };

    const orderNo = data.out_trade_no;
    const transactionId = data.transaction_id;
    if (!orderNo || !transactionId) throw new BadRequestException('支付回调订单参数缺失');

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { orderNo } });
      if (!payment) throw new BadRequestException('支付记录不存在');
      if (payment.status === 'paid') return;
      if (payment.status !== 'pending') throw new BadRequestException('支付状态不允许更新');

      await tx.payment.update({
        where: { id: payment.id },
        data: { transactionId, status: 'paid', paidAt: new Date() },
      });
    });

    return { code: 'SUCCESS', message: '成功' };
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

    const wxConfig = this.getWxPayConfig();
    const totalFee = Math.round(Number(payment.amount) * 100);
    const body = {
      out_trade_no: payment.orderNo,
      out_refund_no: `RF${payment.orderNo}`,
      reason: '后台操作退款',
      amount: {
        refund: totalFee,
        total: totalFee,
        currency: 'CNY',
      },
    };

    await axios.post('https://api.mch.weixin.qq.com/v3/refund/domestic/refunds', body, {
      headers: {
        Authorization: this.buildWechatAuthorization('POST', '/v3/refund/domestic/refunds', body, wxConfig),
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'beverage-order-server/1.0',
      },
      timeout: 15000,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'refunding' },
    });

    return { success: true };
  }

  async markRefundedByOrderNo(orderNo: string, status: PaymentStatus = 'refunded') {
    return this.prisma.payment.updateMany({ where: { orderNo }, data: { status } });
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

  private getWechatpayPublicKey() {
    const publicKeyPath = process.env.WX_PLATFORM_CERT_PATH || process.env.WX_PAY_PUBLIC_KEY_PATH;
    if (!publicKeyPath) throw new BadRequestException('微信支付平台证书公钥未配置');
    return fs.readFileSync(publicKeyPath, 'utf8');
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

  private decryptWechatResource(resource: { ciphertext: string; nonce: string; associated_data: string }) {
    const apiV3Key = process.env.WX_API_V3_KEY;
    if (!apiV3Key) throw new BadRequestException('微信支付 APIv3 密钥未配置');

    const key = Buffer.from(apiV3Key, 'utf8');
    if (key.length !== 32) throw new BadRequestException('微信支付 APIv3 密钥长度必须为 32 字节');

    const ciphertext = Buffer.from(resource.ciphertext, 'base64');
    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const data = ciphertext.subarray(0, ciphertext.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(resource.nonce, 'utf8'));
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
    const decoded = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return JSON.parse(decoded);
  }

  private verifyWechatNotifySignature(headers: { rawBody?: Buffer; timestamp?: string; nonce?: string; signature?: string; serial?: string }) {
    if (!headers.rawBody || !headers.timestamp || !headers.nonce || !headers.signature) {
      throw new BadRequestException('微信支付回调签名头不完整');
    }
    const message = `${headers.timestamp}\n${headers.nonce}\n${headers.rawBody.toString('utf8')}\n`;
    const ok = crypto
      .createVerify('RSA-SHA256')
      .update(message)
      .verify(this.getWechatpayPublicKey(), headers.signature, 'base64');
    if (!ok) throw new ForbiddenException('微信支付回调签名无效');
  }
}
