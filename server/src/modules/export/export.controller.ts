import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Response } from 'express';

@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('boss', 'admin')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('orders')
  async exportOrders(@Query() query: any, @Res() res: Response) {
    await this.exportService.exportOrders(res, query);
  }

  @Get('earnings')
  async exportEarnings(@Res() res: Response) {
    await this.exportService.exportEarnings(res);
  }

  @Get('withdrawals')
  async exportWithdrawals(@Res() res: Response) {
    await this.exportService.exportWithdrawals(res);
  }
}
