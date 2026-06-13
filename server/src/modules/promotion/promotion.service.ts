import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

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

    const envVersion = this.getWxacodeEnvVersion();
    const checkPath = process.env.WX_WXACODE_CHECK_PATH !== 'false';
    const page = process.env.WX_WXACODE_PAGE || 'pages/index/index';

    try {
      const tokenRes = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: { grant_type: 'client_credential', appid: appId, secret },
      });
      if (tokenRes.data?.errcode || !tokenRes.data?.access_token) {
        const message = this.formatWechatError('获取微信 access_token 失败', tokenRes.data);
        this.logger.warn(message);
        return { code: code.code, qrcode: null, message };
      }
      const accessToken = tokenRes.data.access_token;

      const qrRes = await axios.post(
        `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
        {
          scene: code.code,
          page,
          width: 280,
          env_version: envVersion,
          check_path: checkPath,
        },
        { responseType: 'arraybuffer' },
      );
      const contentType = String(qrRes.headers?.['content-type'] || '');
      if (contentType.includes('application/json')) {
        const wechatError = this.parseWechatBuffer(qrRes.data);
        const message = this.formatWechatError('微信小程序码生成失败', wechatError);
        this.logger.warn(message);
        return { code: code.code, qrcode: null, message };
      }
      const base64 = Buffer.from(qrRes.data).toString('base64');
      return { code: code.code, qrcode: `data:image/png;base64,${base64}` };
    } catch (error: any) {
      const message = error?.response?.data
        ? this.formatWechatError('微信小程序码生成失败', this.parseWechatBuffer(error.response.data))
        : '微信小程序码生成失败，请检查 AppID/Secret、发布版本和服务器网络';
      this.logger.warn(`${message}${error?.message ? `: ${error.message}` : ''}`);
      return { code: code.code, qrcode: null, message };
    }
  }

  private getWxacodeEnvVersion(): 'release' | 'trial' | 'develop' {
    const value = process.env.WX_WXACODE_ENV_VERSION || 'release';
    if (['release', 'trial', 'develop'].includes(value)) return value as 'release' | 'trial' | 'develop';
    this.logger.warn(`WX_WXACODE_ENV_VERSION 配置无效：${value}，已回退到 release`);
    return 'release';
  }

  private parseWechatBuffer(data: any) {
    try {
      const text = Buffer.isBuffer(data) ? data.toString('utf8') : Buffer.from(data).toString('utf8');
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private formatWechatError(prefix: string, data: any) {
    if (!data) return prefix;
    const errcode = data.errcode ?? 'unknown';
    const errmsg = data.errmsg || '未知错误';
    return `${prefix}：${errmsg}（errcode: ${errcode}）`;
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

  async getSummary(promoterId: number) {
    const [bindingCount, totalCommission, pendingCommission, settledCommission] = await Promise.all([
      this.prisma.merchantBinding.count({ where: { promoterId } }),
      this.prisma.earning.aggregate({
        where: { userId: promoterId, role: 'promoter' },
        _sum: { amount: true },
      }),
      this.prisma.earning.aggregate({
        where: { userId: promoterId, role: 'promoter', status: 'pending_settle' },
        _sum: { amount: true },
      }),
      this.prisma.earning.aggregate({
        where: { userId: promoterId, role: 'promoter', status: { in: ['settled', 'withdrawn'] } },
        _sum: { amount: true },
      }),
    ]);

    return {
      bindingCount,
      totalCommission: Number(totalCommission._sum.amount || 0),
      pendingCommission: Number(pendingCommission._sum.amount || 0),
      settledCommission: Number(settledCommission._sum.amount || 0),
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

  async getMerchantLeads(query: { page?: number; pageSize?: number; promoterId?: number; status?: string }) {
    const { page = 1, pageSize = 20, promoterId, status } = query;
    const where: any = {};
    if (promoterId) where.promoterId = +promoterId;
    if (status) where.status = status;
    const [list, total] = await Promise.all([
      this.prisma.promoterMerchantLead.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        include: { promoter: { select: { id: true, realName: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promoterMerchantLead.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async updateMerchantLeadStatus(id: number, status: string) {
    if (!['pending', 'followed', 'converted', 'rejected'].includes(status)) {
      throw new BadRequestException('线索状态不正确');
    }
    return this.prisma.promoterMerchantLead.update({
      where: { id },
      data: { status: status as any },
      include: { promoter: { select: { id: true, realName: true, phone: true } } },
    });
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
