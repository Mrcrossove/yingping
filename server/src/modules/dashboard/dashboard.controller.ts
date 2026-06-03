import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { ApiResult } from '../../common/api-result';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('boss', 'admin')
@RequirePermission('finance:view')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    const data = await this.dashboardService.getStats();
    return ApiResult.success(data);
  }

  @Get('trend')
  async getOrderTrend(@Query('days') days: string) {
    const data = await this.dashboardService.getOrderTrend(+days || 7);
    return ApiResult.success(data);
  }

  @Get('earnings-summary')
  async getEarningsSummary() {
    const data = await this.dashboardService.getEarningsSummary();
    return ApiResult.success(data);
  }

  @Get('low-stock')
  async getLowStock() {
    const data = await this.dashboardService.getLowStock();
    return ApiResult.success(data);
  }
}
