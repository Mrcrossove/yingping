import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ApiResult } from '../../common/api-result';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
export class WithdrawalController {
  constructor(private withdrawalService: WithdrawalService) {}

  @Post('apply')
  @Roles('salesperson', 'maker', 'delivery', 'promoter')
  async apply(@Body() body: any, @Request() req) {
    const data = await this.withdrawalService.apply(req.user.id, body);
    return ApiResult.success(data, '提现申请已提交');
  }

  @Get('my')
  async findMyWithdrawals(@Request() req, @Query() query: any) {
    const data = await this.withdrawalService.findMyWithdrawals(req.user.id, query);
    return ApiResult.success(data);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('boss', 'admin')
  async findAll(@Query() query: any) {
    const data = await this.withdrawalService.findAll(query);
    return ApiResult.success(data);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('boss', 'admin')
  async approve(@Param('id') id: string) {
    const data = await this.withdrawalService.approve(+id);
    return ApiResult.success(data, '审核通过');
  }


  @Post(':id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles('boss', 'admin')
  async markPaid(@Param('id') id: string) {
    const data = await this.withdrawalService.markPaid(+id);
    return ApiResult.success(data, '已标记为已打款');
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('boss', 'admin')
  async reject(@Param('id') id: string, @Body('remark') remark: string) {
    const data = await this.withdrawalService.reject(+id, remark);
    return ApiResult.success(data, '已拒绝');
  }
}
