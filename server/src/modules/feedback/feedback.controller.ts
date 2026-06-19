import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { ApiResult } from '../../common/api-result';
import { BACKOFFICE_PERMISSION_ROLES } from '../../common/access-roles';

@Controller('feedback')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @Post()
  @Roles('merchant')
  async create(@Body() body: any, @Request() req) {
    const data = await this.feedbackService.create(req.user.id, body);
    return ApiResult.success(data, '反馈已提交');
  }

  @Get('my')
  @Roles('merchant')
  async findMy(@Query() query: any, @Request() req) {
    const data = await this.feedbackService.findMyFeedback(req.user.id, query);
    return ApiResult.success(data);
  }

  @Get()
  @Roles(...BACKOFFICE_PERMISSION_ROLES)
  @RequirePermission('feedback:manage')
  async findAll(@Query() query: any) {
    const data = await this.feedbackService.findAll(query);
    return ApiResult.success(data);
  }

  @Put(':id/status')
  @Roles(...BACKOFFICE_PERMISSION_ROLES)
  @RequirePermission('feedback:manage')
  async updateStatus(@Param('id') id: string, @Body() body: any, @Request() req) {
    const data = await this.feedbackService.updateStatus(+id, req.user.id, body);
    return ApiResult.success(data, '反馈状态已更新');
  }
}
