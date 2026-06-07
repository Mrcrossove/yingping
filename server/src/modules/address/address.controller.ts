import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResult } from '../../common/api-result';
import { SaveAddressDto } from './dto';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private addressService: AddressService) {}

  @Get()
  async findByUser(@Request() req) {
    const data = await this.addressService.findByUser(req.user.id);
    return ApiResult.success(data);
  }

  @Post()
  async create(@Body() body: SaveAddressDto, @Request() req) {
    const data = await this.addressService.create(req.user.id, body);
    return ApiResult.success(data, '添加成功');
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: SaveAddressDto, @Request() req) {
    const data = await this.addressService.update(+id, req.user.id, body);
    return ApiResult.success(data, '更新成功');
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const data = await this.addressService.remove(+id, req.user.id);
    return ApiResult.success(data, '删除成功');
  }

  @Post(':id/default')
  async setDefault(@Param('id') id: string, @Request() req) {
    const data = await this.addressService.setDefault(+id, req.user.id);
    return ApiResult.success(data, '已设为默认');
  }
}
