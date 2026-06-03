import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { ApiResult } from '../../common/api-result';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @Roles('merchant', 'salesperson')
  async create(@Body() body: any, @Request() req) {
    const data = await this.orderService.create(body, req.user.id);
    return ApiResult.success(data, '下单成功');
  }

  @Get()
  async findAll(@Query() query: any, @Request() req) {
    if (req.user.role === 'merchant') query.merchantId = req.user.id;
    else if (req.user.role === 'salesperson') query.salespersonId = req.user.id;
    else if (req.user.role === 'maker') query.makerId = req.user.id;
    else if (req.user.role === 'delivery') query.deliveryId = req.user.id;
    const data = await this.orderService.findAll(query);
    return ApiResult.success(data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const data = await this.orderService.findOneForUser(+id, req.user);
    return ApiResult.success(data);
  }

  @Post(':id/accept')
  @Roles('salesperson', 'admin', 'boss')
  @RequirePermission('order:manage')
  async accept(@Param('id') id: string, @Request() req) {
    const data = await this.orderService.acceptOrder(+id, req.user.id);
    return ApiResult.success(data, '接单成功');
  }

  @Post(':id/dispatch-maker')
  @Roles('salesperson', 'admin', 'boss')
  @RequirePermission('order:dispatch')
  async dispatchToMaker(@Param('id') id: string, @Body('makerId') makerId: number, @Request() req) {
    const data = await this.orderService.dispatchToMaker(+id, makerId, req.user.id);
    return ApiResult.success(data, '派单成功');
  }


  @Post(':id/dispatch-both')
  @Roles('salesperson', 'admin', 'boss')
  @RequirePermission('order:dispatch')
  async dispatchBoth(@Param('id') id: string, @Body('makerId') makerId: number, @Body('deliveryId') deliveryId: number, @Request() req) {
    const data = await this.orderService.dispatchBoth(+id, makerId, deliveryId, req.user.id);
    return ApiResult.success(data, '派单成功');
  }

  @Post(':id/maker-start')
  @Roles('maker')
  async makerStart(@Param('id') id: string, @Request() req) {
    const data = await this.orderService.makerStartMaking(+id, req.user.id);
    return ApiResult.success(data, '开始制作');
  }

  @Post(':id/maker-complete')
  @Roles('maker')
  async makerComplete(@Param('id') id: string, @Request() req) {
    const data = await this.orderService.makerComplete(+id, req.user.id);
    return ApiResult.success(data, '制作完成');
  }

  @Post(':id/dispatch-delivery')
  @Roles('salesperson', 'admin', 'boss')
  @RequirePermission('order:dispatch')
  async dispatchToDelivery(@Param('id') id: string, @Body('deliveryId') deliveryId: number, @Request() req) {
    const data = await this.orderService.dispatchToDelivery(+id, deliveryId, req.user.id);
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
    return ApiResult.success(data, '配送完成');
  }

  @Post(':id/cancel')
  @Roles('merchant', 'admin', 'boss', 'salesperson')
  async cancel(@Param('id') id: string, @Request() req) {
    const data = await this.orderService.cancel(+id, req.user);
    return ApiResult.success(data, '订单已取消');
  }

  @Post('manual')
  @Roles('salesperson', 'admin', 'boss')
  async manualCreate(@Body() body: any, @Request() req) {
    const data = await this.orderService.manualCreate(body, req.user.id);
    return ApiResult.success(data, '手动录单成功');
  }

  @Post('batch-dispatch')
  @Roles('salesperson', 'admin', 'boss')
  @RequirePermission('order:dispatch')
  async batchDispatch(@Body() body: { orderIds: number[]; makerId: number; deliveryId: number }, @Request() req) {
    const data = await this.orderService.batchDispatch(body.orderIds, body.makerId, body.deliveryId, req.user.id);
    return ApiResult.success(data, '批量派单完成');
  }
}
