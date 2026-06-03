import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { ApiResult } from '../../common/api-result';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @Roles('boss', 'admin')
  @RequirePermission('user:manage')
  async findAll(@Query() query: any) {
    const data = await this.userService.findAll(query);
    return ApiResult.success(data);
  }

  @Get('pending-merchants')
  @Roles('boss', 'admin')
  @RequirePermission('user:manage')
  async getPendingMerchants(@Query() query: any) {
    const data = await this.userService.getPendingMerchants(query);
    return ApiResult.success(data);
  }

  @Get('dispatch-staff')
  @Roles('boss', 'admin', 'salesperson')
  async getDispatchStaff(@Query('role') role: string) {
    const data = await this.userService.getDispatchStaff(role);
    return ApiResult.success(data);
  }

  @Get('merchants')
  @Roles('boss', 'admin', 'salesperson')
  async getMerchants(@Query() query: any) {
    const data = await this.userService.getMerchants(query);
    return ApiResult.success(data);
  }

  @Get(':id')
  @Roles('boss', 'admin')
  @RequirePermission('user:manage')
  async findOne(@Param('id') id: string) {
    const data = await this.userService.findOne(+id);
    return ApiResult.success(data);
  }

  @Post()
  @Roles('boss', 'admin')
  @RequirePermission('user:manage')
  async create(@Body() body: any) {
    const data = await this.userService.create(body, null);
    return ApiResult.success(data, '创建成功');
  }

  @Put(':id')
  @Roles('boss', 'admin')
  @RequirePermission('user:manage')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.userService.update(+id, body);
    return ApiResult.success(data, '更新成功');
  }


  @Post(':id/reset-password')
  @Roles('boss', 'admin')
  @RequirePermission('user:manage')
  async resetPassword(@Param('id') id: string, @Body('password') password: string) {
    const data = await this.userService.resetPassword(+id, password);
    return ApiResult.success(data, '密码重置成功');
  }

  @Post(':id/approve-merchant')
  @Roles('boss', 'admin')
  @RequirePermission('user:manage')
  async approveMerchant(@Param('id') id: string) {
    const data = await this.userService.approveMerchant(+id);
    return ApiResult.success(data, '商户审核通过');
  }

  @Post(':id/reject-merchant')
  @Roles('boss', 'admin')
  @RequirePermission('user:manage')
  async rejectMerchant(@Param('id') id: string) {
    const data = await this.userService.rejectMerchant(+id);
    return ApiResult.success(data, '商户已拒绝');
  }

  @Delete(':id')
  @Roles('boss', 'admin')
  @RequirePermission('user:manage')
  async remove(@Param('id') id: string) {
    const data = await this.userService.remove(+id);
    return ApiResult.success(data, '删除成功');
  }
}
