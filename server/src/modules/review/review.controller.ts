import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResult } from '../../common/api-result';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post()
  async create(@Body() body: { orderId: number; rating: number; content?: string }, @Request() req) {
    const data = await this.reviewService.create(body.orderId, req.user.id, body);
    return ApiResult.success(data, '评价成功');
  }

  @Get('order/:orderId')
  async findByOrder(@Param('orderId') orderId: string) {
    const data = await this.reviewService.findByOrder(+orderId);
    return ApiResult.success(data);
  }

  @Get('my')
  async findByUser(@Request() req, @Query() query: any) {
    const data = await this.reviewService.findByUser(req.user.id, query);
    return ApiResult.success(data);
  }
}
