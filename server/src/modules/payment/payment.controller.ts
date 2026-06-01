import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ApiResult } from '../../common/api-result';

@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('create/:orderId')
  @UseGuards(JwtAuthGuard)
  async create(@Param('orderId') orderId: string, @Request() req) {
    const data = await this.paymentService.createPayment(+orderId, req.user.id);
    return ApiResult.success(data, '支付单已创建');
  }

  @Post('jsapi/:orderId')
  @UseGuards(JwtAuthGuard)
  async jsapiPay(@Param('orderId') orderId: string, @Body('openid') openid: string) {
    const data = await this.paymentService.jsapiPay(+orderId, openid);
    return ApiResult.success(data);
  }

  @Post('notify')
  async payNotify(@Body('orderNo') orderNo: string, @Body('transactionId') transactionId: string) {
    const data = await this.paymentService.handlePayNotify(orderNo, transactionId);
    return ApiResult.success(data);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  async getByOrder(@Param('orderId') orderId: string) {
    const data = await this.paymentService.getPaymentByOrder(+orderId);
    return ApiResult.success(data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss', 'admin')
  async getPayments(@Query() query: any) {
    const data = await this.paymentService.getPayments(query);
    return ApiResult.success(data);
  }

  @Post('refund/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss', 'admin')
  async refund(@Param('orderId') orderId: string) {
    const data = await this.paymentService.refund(+orderId);
    return ApiResult.success(data, '退款成功');
  }
}
