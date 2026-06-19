import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { ApiResult } from '../../common/api-result';
import { SettingService } from './setting.service';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { BACKOFFICE_PERMISSION_ROLES } from '../../common/access-roles';

@Controller('settings')
export class SettingController {
  constructor(private settingService: SettingService) {}

  @Get('public')
  async publicSettings() {
    const data = await this.settingService.getPublicSettings();
    return ApiResult.success(data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(...BACKOFFICE_PERMISSION_ROLES)
  @RequirePermission('setting:manage')
  async adminSettings() {
    const data = await this.settingService.getAdminSettings();
    return ApiResult.success(data);
  }

  @Put('customer-service-phone')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(...BACKOFFICE_PERMISSION_ROLES)
  @RequirePermission('setting:manage')
  async updateCustomerServicePhone(@Body('phone') phone: string) {
    const data = await this.settingService.updateCustomerServicePhone(phone);
    return ApiResult.success(data, '保存成功');
  }
}
