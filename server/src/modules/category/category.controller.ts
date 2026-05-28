import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ApiResult } from '../../common/api-result';

@Controller('categories')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Get()
  async findAll() {
    const data = await this.categoryService.findAll();
    return ApiResult.success(data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.categoryService.findOne(+id);
    return ApiResult.success(data);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss', 'admin')
  async create(@Body() body: any) {
    const data = await this.categoryService.create(body);
    return ApiResult.success(data, '创建成功');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss', 'admin')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.categoryService.update(+id, body);
    return ApiResult.success(data, '更新成功');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss', 'admin')
  async remove(@Param('id') id: string) {
    const data = await this.categoryService.remove(+id);
    return ApiResult.success(data, '删除成功');
  }
}
