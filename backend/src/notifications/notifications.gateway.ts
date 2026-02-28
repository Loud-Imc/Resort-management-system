import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  path: '/socket.io',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('NotificationsGateway');

  afterInit(server: Server) {
    this.logger.log('Socket.io Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    const { userId, roles } = client.handshake.query;
    this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    
    if (userId) {
        client.join(`user_${userId}`);
        this.logger.log(`Client ${client.id} joined room: user_${userId}`);
    }

    if (roles) {
        try {
            const rolesArray = JSON.parse(roles as string);
            if (Array.isArray(rolesArray)) {
                if (rolesArray.includes('SuperAdmin') || rolesArray.includes('Admin')) {
                    client.join('admins');
                    this.logger.log(`Client ${client.id} joined room: admins`);
                }
            }
        } catch (e) {
            this.logger.error('Failed to parse roles from socket query');
        }
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Generic broadcast method
  sendToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Room specific broadcast
  sendToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }
}
