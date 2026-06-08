import { Controller, Get, Post, Param, Body, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { ApiResult } from '../../common/api-result';

@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('create/:orderId')
  @UseGuards(JwtAuthGuard)
  async create(@Param('orderId') orderId: string, @Request() req) {
    const data = await this.paymentService.createPayment(+orderId, req.user);
    return ApiResult.success(data, '支付单已创建');
  }

  @Post('jsapi/:orderId')
  @UseGuards(JwtAuthGuard)
  async jsapiPay(@Param('orderId') orderId: string, @Body('openid') openid: string, @Request() req) {
    const data = await this.paymentService.jsapiPay(+orderId, openid, req.user);
    return ApiResult.success(data);
  }

  @Post('notify')
  async payNotify(
    @Body() body: any,
    @Request() req,
    @Headers('wechatpay-timestamp') timestamp: string,
    @Headers('wechatpay-nonce') nonce: string,
    @Headers('wechatpay-signature') signature: string,
    @Headers('wechatpay-serial') serial: string,
  ) {
    return this.paymentService.handlePayNotify(body, {
      rawBody: req.rawBody,
      timestamp,
      nonce,
      signature,
      serial,
    });
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  async getByOrder(@Param('orderId') orderId: string, @Request() req) {
    const data = await this.paymentService.getPaymentByOrder(+orderId, req.user);
    return ApiResult.success(data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('boss', 'admin')
  @RequirePermission('finance:view')
  async getPayments(@Query() query: any) {
    const data = await this.paymentService.getPayments(query);
    return ApiResult.success(data);
  }

  @Post('refund/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('boss', 'admin')
  @RequirePermission('finance:view')
  async refund(@Param('orderId') orderId: string) {
    const data = await this.paymentService.refund(+orderId);
    return ApiResult.success(data, '退款申请已提交');
  }
}
