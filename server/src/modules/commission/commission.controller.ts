import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
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
  async findAll(@Query() query: any) {
    const data = await this.commissionService.findAll(query);
    return ApiResult.success(data);
  }

  @Post('product/:productId')
  @Roles('boss', 'admin')
  @RequirePermission('commission:manage')
  async setProductRules(@Param('productId') productId: string, @Body('rules') rules: any[]) {
    const data = await this.commissionService.setProductRules(+productId, rules);
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
