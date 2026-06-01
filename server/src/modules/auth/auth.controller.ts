import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiResult } from '../../common/api-result';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

class LoginDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
}

class RegisterDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
  @IsString() @IsNotEmpty() realName: string;
  @IsOptional() @IsIn(['merchant']) role?: string;
  @IsOptional() @IsString() phone?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto.username, dto.password);
    return ApiResult.success(data, '登录成功');
  }

  @Post('wx-login')
  async wxLogin(@Body('code') code: string) {
    const data = await this.authService.wxLogin(code);
    return ApiResult.success(data, '微信登录成功');
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return ApiResult.success(data, '注册成功');
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const data = await this.authService.getProfile(req.user.id);
    return ApiResult.success(data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bind-phone')
  async bindPhone(@Request() req, @Body('phone') phone: string) {
    const data = await this.authService.bindPhone(req.user.id, phone);
    return ApiResult.success(data, '手机绑定成功');
  }

  @UseGuards(JwtAuthGuard)
  @Post('bind-openid')
  async bindOpenid(@Request() req, @Body('openid') openid: string) {
    const data = await this.authService.bindOpenid(req.user.id, openid);
    return ApiResult.success(data, '微信绑定成功');
  }
}
