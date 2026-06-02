import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class PromotionService {
  constructor(private prisma: PrismaService) {}

  async generateCode(promoterId: number) {
    const code = this.randomCode();
    return this.prisma.promotionCode.create({
      data: { code, promoterId },
      include: { promoter: { select: { id: true, realName: true, phone: true } } },
    });
  }

  async findMyCode(promoterId: number) {
    const code = await this.prisma.promotionCode.findFirst({
      where: { promoterId },
      include: { promoter: { select: { id: true, realName: true, phone: true } } },
    });
    return code;
  }

  async bindMerchant(merchantId: number, promoterCode: string) {
    const code = await this.prisma.promotionCode.findUnique({ where: { code: promoterCode } });
    if (!code) throw new BadRequestException('推广码不存在');
    if (code.status === 0) throw new BadRequestException('推广码已失效');

    const existing = await this.prisma.merchantBinding.findUnique({ where: { merchantId } });
    if (existing) throw new BadRequestException('该商户已绑定推广员');

    return this.prisma.merchantBinding.create({
      data: { merchantId, promoterId: code.promoterId },
    });
  }

  async findAllBindings(query: { page?: number; pageSize?: number; promoterId?: number }) {
    const { page = 1, pageSize = 20, promoterId } = query;
    const where: any = {};
    if (promoterId) where.promoterId = +promoterId;

    const [list, total] = await Promise.all([
      this.prisma.merchantBinding.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        include: {
          merchant: { select: { id: true, realName: true, phone: true } },
          promoter: { select: { id: true, realName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchantBinding.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async findAllCodes(query: { page?: number; pageSize?: number; promoterId?: number }) {
    const { page = 1, pageSize = 20, promoterId } = query;
    const where: any = {};
    if (promoterId) where.promoterId = +promoterId;

    const [list, total] = await Promise.all([
      this.prisma.promotionCode.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        include: { promoter: { select: { id: true, realName: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promotionCode.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  private randomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async getWxacode(promoterId: number) {
    const code = await this.prisma.promotionCode.findFirst({ where: { promoterId } });
    if (!code) throw new BadRequestException('请先生成推广码');

    const appId = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;
    if (!appId || !secret) {
      return { code: code.code, qrcode: null, message: '请配置微信 AppID 和 Secret' };
    }

    try {
      const tokenRes = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: { grant_type: 'client_credential', appid: appId, secret },
      });
      const accessToken = tokenRes.data.access_token;

      const qrRes = await axios.post(
        `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
        { scene: code.code, page: 'pages/index/index', width: 280 },
        { responseType: 'arraybuffer' },
      );
      const base64 = Buffer.from(qrRes.data).toString('base64');
      return { code: code.code, qrcode: `data:image/png;base64,${base64}` };
    } catch {
      return { code: code.code, qrcode: null, message: '二维码生成失败，已显示文本码' };
    }
  }

  async getCommissionDetails(promoterId: number, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;

    const earnings = await this.prisma.earning.findMany({
      where: { userId: promoterId, role: 'promoter' },
      skip: (page - 1) * pageSize,
      take: +pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { merchant: { select: { realName: true } } } },
      },
    });

    const total = await this.prisma.earning.count({
      where: { userId: promoterId, role: 'promoter' },
    });

    const totalCommission = await this.prisma.earning.aggregate({
      where: { userId: promoterId, role: 'promoter' },
      _sum: { amount: true },
    });

    return {
      list: earnings.map((e) => ({
        id: e.id,
        orderNo: e.orderNo,
        merchantName: (e.order as any)?.merchant?.realName || '-',
        amount: Number(e.amount),
        status: e.status,
        createdAt: e.createdAt,
      })),
      total,
      totalCommission: Number(totalCommission._sum.amount || 0),
      page,
      pageSize,
    };
  }

  async getMyMerchantLeads(promoterId: number, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;
    const [list, total] = await Promise.all([
      this.prisma.promoterMerchantLead.findMany({
        where: { promoterId },
        skip: (page - 1) * pageSize,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promoterMerchantLead.count({ where: { promoterId } }),
    ]);
    return { list, total, page, pageSize };
  }

  async uploadMerchant(data: {
    promoterId: number;
    name?: string;
    merchantName?: string;
    contactName?: string;
    phone: string;
    address?: string;
    remark?: string;
  }) {
    const merchantName = (data.merchantName || data.name || '').trim();
    const phone = data.phone?.trim();
    if (!merchantName || !phone) throw new BadRequestException('商家名称和电话不能为空');

    const existing = await this.prisma.promoterMerchantLead.findUnique({
      where: { promoterId_phone: { promoterId: data.promoterId, phone } },
    });
    if (existing) throw new BadRequestException('该商家电话已提交');

    return this.prisma.promoterMerchantLead.create({
      data: {
        promoterId: data.promoterId,
        merchantName,
        contactName: data.contactName,
        phone,
        address: data.address,
        remark: data.remark,
      },
    });
  }
}
