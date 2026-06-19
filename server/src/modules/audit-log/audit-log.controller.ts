import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { RequirePermission } from '../../common/permissions.decorator';
import { PermissionsGuard } from '../../common/permissions.guard';
import { ApiResult } from '../../common/api-result';
import { BACKOFFICE_PERMISSION_ROLES } from '../../common/access-roles';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(...BACKOFFICE_PERMISSION_ROLES)
@RequirePermission('audit:view')
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @Get()
  async findAll(@Query() query: any) {
    const data = await this.auditLogService.findAll(query);
    return ApiResult.success(data);
  }
}
