import { Module } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [WithdrawalController],
  providers: [WithdrawalService],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
