import { BadRequestException, Injectable } from '@nestjs/common';
import { CommissionType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const COMMISSION_ROLES: Role[] = ['delivery', 'promoter'];
const COMMISSION_TYPES: CommissionType[] = ['percentage', 'fixed'];

@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService) {}

  async getStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: COMMISSION_ROLES as any[] }, status: 1 },
      select: { id: true, realName: true, phone: true, role: true },
      orderBy: [{ role: 'asc' }, { id: 'desc' }],
    });
  }

  async findAll(query: { categoryId?: number; keyword?: string }) {
    const where: any = {};
    if (query.categoryId) where.categoryId = +query.categoryId;
    if (query.keyword) where.name = { contains: query.keyword };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        commissionRules: {
          where: { userId: { not: null } },
          include: { user: { select: { id: true, realName: true, phone: true, role: true, status: true } } },
          orderBy: [{ role: 'asc' }, { userId: 'asc' }],
        },
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

  async setProductRules(productId: number, rules: Array<{ role: string; userId?: number | string; type?: string; value?: number | string | null; enabled?: boolean }>) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BadRequestException('商品不存在');
    if (!Array.isArray(rules)) throw new BadRequestException('提成规则格式不正确');

    const normalized = rules.map((rule) => this.normalizeRule(rule));
    const enabledRules = normalized.filter((rule) => rule.enabled && rule.value > 0);
    await this.validateRuleUsers(enabledRules);

    return this.prisma.$transaction(async (tx) => {
      await tx.commissionRule.deleteMany({ where: { productId, role: { in: COMMISSION_ROLES } } });

      if (enabledRules.length > 0) {
        await tx.commissionRule.createMany({
          data: enabledRules.map((rule) => ({
            productId,
            userId: rule.userId,
            role: rule.role,
            type: rule.type,
            value: rule.value,
          })),
        });
      }

      return tx.commissionRule.findMany({
        where: { productId },
        include: { user: { select: { id: true, realName: true, phone: true, role: true, status: true } } },
        orderBy: { role: 'asc' },
      });
    });
  }

  async deleteRule(id: number) {
    return this.prisma.commissionRule.delete({ where: { id } });
  }

  private normalizeRule(rule: { role: string; userId?: number | string; type?: string; value?: number | string | null; enabled?: boolean }) {
    if (!COMMISSION_ROLES.includes(rule.role as Role)) throw new BadRequestException('提成角色不正确');
    const type = (rule.type || 'percentage') as CommissionType;
    if (!COMMISSION_TYPES.includes(type)) throw new BadRequestException('提成方式不正确');
    const userId = Number(rule.userId || 0);
    if (!Number.isInteger(userId) || userId <= 0) throw new BadRequestException('请选择提成员工');
    const value = Number(rule.value || 0);
    if (!Number.isFinite(value) || value < 0) throw new BadRequestException('提成数值不能小于 0');
    if (type === 'percentage' && value > 100) throw new BadRequestException('百分比提成不能超过 100%');

    return {
      role: rule.role as Role,
      userId,
      type,
      value,
      enabled: rule.enabled !== false,
    };
  }

  private async validateRuleUsers(rules: Array<{ role: Role; userId: number }>) {
    if (rules.length === 0) return;
    const userIds = Array.from(new Set(rules.map((rule) => rule.userId)));
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: 1 },
      select: { id: true, role: true },
    });
    const roleByUserId = new Map(users.map((user) => [user.id, user.role]));

    for (const rule of rules) {
      if (roleByUserId.get(rule.userId) !== rule.role) {
        throw new BadRequestException('提成员工与角色不匹配或已被禁用');
      }
    }
  }
}
