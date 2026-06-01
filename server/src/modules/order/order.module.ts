import { Module, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [forwardRef(() => WebsocketModule)],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
