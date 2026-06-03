import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new UnauthorizedException('请先登录');

    if (user.role === 'boss') return true;
    if (user.role !== 'admin') return true;

    const ap = await this.prisma.adminPermission.findMany({
      where: { adminId: user.id },
      include: { permission: true },
    });
    const codes = ap.map((p) => p.permission.code);
    return requiredPermissions.every((p) => codes.includes(p));
  }
}
