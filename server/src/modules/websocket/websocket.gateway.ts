import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, string[]>();

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    console.log('WebSocket initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token as string);
      client.data.user = payload;

      const userId = payload.sub;
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);

      client.join(`user:${userId}`);
      client.join(`role:${payload.role}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      const sockets = this.userSockets.get(user.sub) || [];
      this.userSockets.set(user.sub, sockets.filter((s) => s !== client.id));
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    const user = client.data.user;
    if (!user) return { event: 'error', data: 'unauthorized' };
    const allowedRooms = new Set([`user:${user.sub}`, `role:${user.role}`]);
    if (!allowedRooms.has(room)) return { event: 'error', data: 'forbidden' };
    client.join(room);
    return { event: 'joined', data: room };
  }

  notifyNewOrder(order: any) {
    this.server.to('role:salesperson').to('role:admin').to('role:boss').emit('new-order', order);
  }

  notifyOrderStatusChange(orderId: number, status: string, action: string) {
    this.server.emit('order-status-changed', { orderId, status, action });
  }

  notifyNewTask(userId: number, task: any) {
    this.server.to(`user:${userId}`).emit('new-task', task);
  }
}
