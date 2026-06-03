import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permission.findMany({ orderBy: { id: 'asc' } });
  }

  async getAdminPermissions(adminId: number) {
    return this.prisma.adminPermission.findMany({
      where: { adminId },
      include: { permission: true },
    });
  }

  async setAdminPermissions(adminId: number, permissionIds: number[]) {
    await this.prisma.adminPermission.deleteMany({ where: { adminId } });
    if (permissionIds.length > 0) {
      await this.prisma.adminPermission.createMany({
        data: permissionIds.map((pid) => ({ adminId, permissionId: pid })),
      });
    }
    return this.getAdminPermissions(adminId);
  }

  async initDefaultPermissions() {
    const defaults = [
      { name: '订单管理', code: 'order:manage', description: '查看和管理订单' },
      { name: '派单管理', code: 'order:dispatch', description: '派单给制作员和配送员' },
      { name: '员工管理', code: 'user:manage', description: '创建和管理员工' },
      { name: '商品管理', code: 'product:manage', description: '管理商品和分类' },
      { name: '权限管理', code: 'permission:manage', description: '分配管理员权限' },
      { name: '提成设置', code: 'commission:manage', description: '设置提成比例' },
      { name: '提现审核', code: 'withdrawal:manage', description: '审核提现申请' },
      { name: '数据导出', code: 'export:manage', description: '导出Excel报表' },
      { name: '推广管理', code: 'promotion:manage', description: '管理推广码和绑定' },
      { name: '查看财务数据', code: 'finance:view', description: '查看财务收益报表' },
      { name: '操作日志', code: 'audit:view', description: '查看系统操作日志' },
    ];
    for (const p of defaults) {
      await this.prisma.permission.upsert({
        where: { code: p.code },
        update: {},
        create: p,
      });
    }
    return this.findAll();
  }
}
