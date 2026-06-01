import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../modules/audit-log/audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private logService: AuditLogService;

  setService(service: AuditLogService) { this.logService = service; }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip } = request;

    return next.handle().pipe(
      tap(() => {
        if (!this.logService || !user || method === 'GET') return;
        const resource = url.split('/')[2] || url;
        this.logService.log({
          userId: user.id, username: user.username, role: user.role,
          action: `${method} ${resource}`,
          resource, detail: JSON.stringify(body || {}).slice(0, 500), ip,
        }).catch(() => {});
      }),
    );
  }
}
