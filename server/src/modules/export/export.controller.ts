import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Response } from 'express';

@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('boss', 'admin')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('orders')
  @RequirePermission('export:manage')
  async exportOrders(@Query() query: any, @Res() res: Response) {
    await this.exportService.exportOrders(res, query);
  }

  @Get('earnings')
  @RequirePermission('finance:view')
  async exportEarnings(@Query() query: any, @Res() res: Response) {
    await this.exportService.exportEarnings(res, query);
  }

  @Get('withdrawals')
  @RequirePermission('export:manage')
  async exportWithdrawals(@Res() res: Response) {
    await this.exportService.exportWithdrawals(res);
  }
}
