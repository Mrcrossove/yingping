import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [NotificationModule],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
