import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ApiResult } from '../../common/api-result';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('boss', 'admin')
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
}
