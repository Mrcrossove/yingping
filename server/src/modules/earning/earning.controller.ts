import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { EarningService } from './earning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ApiResult } from '../../common/api-result';

@Controller('earnings')
@UseGuards(JwtAuthGuard)
export class EarningController {
  constructor(private earningService: EarningService) {}

  @Get('my')
  async findMyEarnings(@Request() req, @Query() query: any) {
    const data = await this.earningService.findByUser(req.user.id, query);
    return ApiResult.success(data);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('boss', 'admin')
  async findAll(@Query() query: any) {
    const data = await this.earningService.findAll(query);
    return ApiResult.success(data);
  }
}
