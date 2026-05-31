import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResult } from '../../common/api-result';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  async findByUser(@Request() req, @Query() query: any) {
    const data = await this.notificationService.findByUser(req.user.id, query);
    return ApiResult.success(data);
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string) {
    const data = await this.notificationService.markRead(+id);
    return ApiResult.success(data);
  }
}
