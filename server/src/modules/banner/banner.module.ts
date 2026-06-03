import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { ApiResult } from '../../common/api-result';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Controller('banners')
export class BannerController {
  constructor(private prisma: PrismaService) {}

  @Get('public')
  async findPublic() {
    const data = await this.prisma.banner.findMany({
      where: { status: 1 },
      orderBy: [{ sort: 'desc' }, { id: 'desc' }],
    });
    return ApiResult.success(data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('boss', 'admin')
  @RequirePermission('product:manage')
  async findAll(@Query() query: any) {
    const { page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (query.status !== undefined) where.status = +query.status;
    const [list, total] = await Promise.all([
      this.prisma.banner.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        orderBy: [{ sort: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.banner.count({ where }),
    ]);
    return ApiResult.success({ list, total, page, pageSize });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('boss', 'admin')
  @RequirePermission('product:manage')
  async create(@Body() body: any) {
    const data = await this.prisma.banner.create({
      data: {
        title: body.title,
        image: body.image,
        link: body.link || null,
        sort: body.sort || 0,
        status: body.status ?? 1,
      },
    });
    return ApiResult.success(data, '创建成功');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('boss', 'admin')
  @RequirePermission('product:manage')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.prisma.banner.update({
      where: { id: +id },
      data: {
        title: body.title,
        image: body.image,
        link: body.link || null,
        sort: body.sort ?? 0,
        status: body.status ?? 1,
      },
    });
    return ApiResult.success(data, '更新成功');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('boss', 'admin')
  @RequirePermission('product:manage')
  async remove(@Param('id') id: string) {
    await this.prisma.banner.delete({ where: { id: +id } });
    return ApiResult.success({ id: +id }, '删除成功');
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [BannerController],
})
export class BannerModule {}
