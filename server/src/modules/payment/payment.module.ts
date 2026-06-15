import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { NotificationModule } from '../notification/notification.module';
import { DispatchModule } from '../dispatch/dispatch.module';

@Module({
  imports: [NotificationModule, DispatchModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
