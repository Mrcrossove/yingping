import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PermissionModule } from './modules/permission/permission.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { CommissionModule } from './modules/commission/commission.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { EarningModule } from './modules/earning/earning.module';
import { WithdrawalModule } from './modules/withdrawal/withdrawal.module';
import { ExportModule } from './modules/export/export.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FileModule } from './modules/file/file.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AddressModule } from './modules/address/address.module';
import { ReviewModule } from './modules/review/review.module';
import { BannerModule } from './modules/banner/banner.module';
import { PermissionsGuard } from './common/permissions.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    UserModule,
    PermissionModule,
    CategoryModule,
    ProductModule,
    OrderModule,
    CommissionModule,
    PromotionModule,
    EarningModule,
    WithdrawalModule,
    ExportModule,
    DashboardModule,
    FileModule,
    WebsocketModule,
    NotificationModule,
    AuditLogModule,
    PaymentModule,
    AddressModule,
    ReviewModule,
    BannerModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
