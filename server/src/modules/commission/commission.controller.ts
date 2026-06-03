import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { ApiResult } from '../../common/api-result';

@Controller('commissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CommissionController {
  constructor(private commissionService: CommissionService) {}

  @Get()
  @Roles('boss', 'admin')
  @RequirePermission('commission:manage')
  async findAll() {
    const data = await this.commissionService.findAll();
    return ApiResult.success(data);
  }

  @Post()
  @Roles('boss', 'admin')
  @RequirePermission('commission:manage')
  async setRule(@Body() body: { categoryId: number; role: string; percentage: number }) {
    const data = await this.commissionService.setRule(body.categoryId, body.role, body.percentage);
    return ApiResult.success(data, '提成规则设置成功');
  }

  @Delete(':id')
  @Roles('boss', 'admin')
  @RequirePermission('commission:manage')
  async deleteRule(@Param('id') id: string) {
    const data = await this.commissionService.deleteRule(+id);
    return ApiResult.success(data, '删除成功');
  }
}
