import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
        take: pageSize,
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
        take: pageSize,
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
}
