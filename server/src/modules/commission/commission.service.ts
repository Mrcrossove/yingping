import { BadRequestException, Injectable } from '@nestjs/common';
import { CommissionType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const COMMISSION_ROLES: Role[] = ['salesperson', 'maker', 'delivery', 'promoter'];
const COMMISSION_TYPES: CommissionType[] = ['percentage', 'fixed'];

@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { categoryId?: number; keyword?: string }) {
    const where: any = {};
    if (query.categoryId) where.categoryId = +query.categoryId;
    if (query.keyword) where.name = { contains: query.keyword };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        commissionRules: true,
      },
      orderBy: [{ categoryId: 'asc' }, { id: 'desc' }],
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      status: product.status,
      category: product.category,
      rules: product.commissionRules,
    }));
  }

  async setProductRules(productId: number, rules: Array<{ role: string; type?: string; value?: number | string | null; enabled?: boolean }>) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BadRequestException('商品不存在');
    if (!Array.isArray(rules)) throw new BadRequestException('提成规则格式不正确');

    const normalized = rules.map((rule) => this.normalizeRule(rule));
    return this.prisma.$transaction(async (tx) => {
      for (const role of COMMISSION_ROLES) {
        const rule = normalized.find((item) => item.role === role);
        if (!rule || !rule.enabled || rule.value <= 0) {
          await tx.commissionRule.deleteMany({ where: { productId, role } });
          continue;
        }

        await tx.commissionRule.upsert({
          where: { productId_role: { productId, role } },
          update: { type: rule.type, value: rule.value },
          create: { productId, role, type: rule.type, value: rule.value },
        });
      }

      return tx.commissionRule.findMany({
        where: { productId },
        orderBy: { role: 'asc' },
      });
    });
  }

  async deleteRule(id: number) {
    return this.prisma.commissionRule.delete({ where: { id } });
  }

  private normalizeRule(rule: { role: string; type?: string; value?: number | string | null; enabled?: boolean }) {
    if (!COMMISSION_ROLES.includes(rule.role as Role)) throw new BadRequestException('提成角色不正确');
    const type = (rule.type || 'percentage') as CommissionType;
    if (!COMMISSION_TYPES.includes(type)) throw new BadRequestException('提成方式不正确');
    const value = Number(rule.value || 0);
    if (!Number.isFinite(value) || value < 0) throw new BadRequestException('提成数值不能小于 0');
    if (type === 'percentage' && value > 100) throw new BadRequestException('百分比提成不能超过 100%');

    return {
      role: rule.role as Role,
      type,
      value,
      enabled: rule.enabled !== false,
    };
  }
}
