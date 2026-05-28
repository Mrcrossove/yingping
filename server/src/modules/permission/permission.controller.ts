import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ApiResult } from '../../common/api-result';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionController {
  constructor(private permissionService: PermissionService) {}

  @Get()
  @Roles('boss', 'admin')
  async findAll() {
    const data = await this.permissionService.findAll();
    return ApiResult.success(data);
  }

  @Post('init')
  @Roles('boss')
  async initDefaults() {
    const data = await this.permissionService.initDefaultPermissions();
    return ApiResult.success(data, '初始化完成');
  }

  @Get('admin/:adminId')
  @Roles('boss')
  async getAdminPermissions(@Param('adminId') adminId: string) {
    const data = await this.permissionService.getAdminPermissions(+adminId);
    return ApiResult.success(data);
  }

  @Post('admin/:adminId')
  @Roles('boss')
  async setAdminPermissions(@Param('adminId') adminId: string, @Body('permissionIds') permissionIds: number[]) {
    const data = await this.permissionService.setAdminPermissions(+adminId, permissionIds);
    return ApiResult.success(data, '权限设置成功');
  }
}
