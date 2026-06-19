import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { ApiResult } from '../../common/api-result';
import { BACKOFFICE_PERMISSION_ROLES } from '../../common/access-roles';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @Roles('merchant')
  async create(@Body() body: any, @Request() req) {
    const data = await this.orderService.create(body, req.user.id);
    return ApiResult.success(data, '下单成功');
  }

  @Get()
  async findAll(@Query() query: any, @Request() req) {
    if (req.user.role === 'merchant') query.merchantId = req.user.id;
    else if (req.user.role === 'delivery') query.deliveryId = req.user.id;
    const data = await this.orderService.findAll(query);
    return ApiResult.success(data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const data = await this.orderService.findOneForUser(+id, req.user);
    return ApiResult.success(data);
  }

  @Post(':id/dispatch-delivery')
  @Roles(...BACKOFFICE_PERMISSION_ROLES)
  @RequirePermission('order:dispatch')
  async dispatchToDelivery(@Param('id') id: string, @Body('deliveryId') deliveryId: number, @Request() req) {
    const data = await this.orderService.dispatchToDelivery(+id, deliveryId, req.user);
    return ApiResult.success(data, '派单成功');
  }


  @Post(':id/delivery-start')
  @Roles('delivery')
  async deliveryStart(@Param('id') id: string, @Request() req) {
    const data = await this.orderService.deliveryStartDelivering(+id, req.user.id);
    return ApiResult.success(data, '开始配送');
  }

  @Post(':id/delivery-complete')
  @Roles('delivery')
  async deliveryComplete(@Param('id') id: string, @Request() req) {
    const data = await this.orderService.deliveryComplete(+id, req.user.id);
    return ApiResult.success(data, '已送达，等待商户确认收货');
  }

  @Post(':id/merchant-confirm-receipt')
  @Roles('merchant')
  async merchantConfirmReceipt(@Param('id') id: string, @Request() req) {
    const data = await this.orderService.merchantConfirmReceipt(+id, req.user.id);
    return ApiResult.success(data, '确认收货成功');
  }

  @Post(':id/cancel')
  @Roles('merchant', 'admin', 'boss')
  async cancel(@Param('id') id: string, @Request() req) {
    const data = await this.orderService.cancel(+id, req.user);
    return ApiResult.success(data, '订单已取消');
  }

  @Put(':id/settlement-merchant-name')
  @Roles(...BACKOFFICE_PERMISSION_ROLES)
  @RequirePermission('order:manage')
  async updateSettlementMerchantName(
    @Param('id') id: string,
    @Body('settlementMerchantName') settlementMerchantName: string,
    @Request() req,
  ) {
    const data = await this.orderService.updateSettlementMerchantName(+id, settlementMerchantName, req.user);
    return ApiResult.success(data, '结算商户已更新');
  }

  @Post('batch-dispatch')
  @Roles(...BACKOFFICE_PERMISSION_ROLES)
  @RequirePermission('order:dispatch')
  async batchDispatch(@Body() body: { orderIds: number[]; deliveryId: number }, @Request() req) {
    const data = await this.orderService.batchDispatch(body.orderIds, body.deliveryId, req.user);
    return ApiResult.success(data, '批量派单完成');
  }
}
