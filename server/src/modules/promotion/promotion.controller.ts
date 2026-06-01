import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ApiResult } from '../../common/api-result';

@Controller('promotion')
export class PromotionController {
  constructor(private promotionService: PromotionService) {}

  @Post('generate-code')
  @UseGuards(JwtAuthGuard)
  @Roles('promoter')
  async generateCode(@Request() req) {
    const data = await this.promotionService.generateCode(req.user.id);
    return ApiResult.success(data, '推广码生成成功');
  }

  @Get('my-code')
  @UseGuards(JwtAuthGuard)
  @Roles('promoter')
  async findMyCode(@Request() req) {
    const data = await this.promotionService.findMyCode(req.user.id);
    return ApiResult.success(data);
  }

  @Post('bind')
  @UseGuards(JwtAuthGuard)
  async bindMerchant(@Body('code') code: string, @Request() req) {
    const data = await this.promotionService.bindMerchant(req.user.id, code);
    return ApiResult.success(data, '绑定成功');
  }

  @Get('bindings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss', 'admin', 'promoter')
  async findAllBindings(@Query() query: any, @Request() req) {
    if (req.user.role === 'promoter') query.promoterId = req.user.id;
    const data = await this.promotionService.findAllBindings(query);
    return ApiResult.success(data);
  }

  @Get('codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('boss', 'admin', 'promoter')
  async findAllCodes(@Query() query: any, @Request() req) {
    if (req.user.role === 'promoter') query.promoterId = req.user.id;
    const data = await this.promotionService.findAllCodes(query);
    return ApiResult.success(data);
  }

  @Get('wxacode')
  @UseGuards(JwtAuthGuard)
  @Roles('promoter')
  async getWxacode(@Request() req) {
    const data = await this.promotionService.getWxacode(req.user.id);
    return ApiResult.success(data);
  }

  @Get('commission-details')
  @UseGuards(JwtAuthGuard)
  @Roles('promoter')
  async getCommissionDetails(@Request() req, @Query() query: any) {
    const data = await this.promotionService.getCommissionDetails(req.user.id, query);
    return ApiResult.success(data);
  }

  @Post('upload-merchant')
  @UseGuards(JwtAuthGuard)
  @Roles('promoter')
  async uploadMerchant(@Body() body: any, @Request() req) {
    const data = await this.promotionService.uploadMerchant({ ...body, promoterId: req.user.id });
    return ApiResult.success(data, '上传成功');
  }
}
