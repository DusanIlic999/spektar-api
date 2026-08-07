import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { MessageEntity } from './message.entity';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
  };
}

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim());

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: allowedOrigins, credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      const payload = this.jwtService.verify<{ sub: string }>(token);
      client.data.userId = payload.sub;
      await client.join(this.userRoom(payload.sub));
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const conversation = await this.chatService.getConversationById(
      data.conversationId,
      client.data.userId,
    );
    await client.join(this.conversationRoom(conversation.id));
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.leave(this.conversationRoom(data.conversationId));
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    const message = await this.chatService.sendMessage(
      data.conversationId,
      client.data.userId,
      data.content,
    );

    this.emitNewMessage(data.conversationId, message);
    return message;
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.chatService.markConversationAsRead(
      data.conversationId,
      client.data.userId,
    );

    this.server
      .to(this.conversationRoom(data.conversationId))
      .emit('messagesRead', {
        conversationId: data.conversationId,
        readBy: client.data.userId,
      });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.to(this.conversationRoom(data.conversationId)).emit('typing', {
      conversationId: data.conversationId,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client
      .to(this.conversationRoom(data.conversationId))
      .emit('stopTyping', {
        conversationId: data.conversationId,
        userId: client.data.userId,
      });
  }

  emitNewMessage(conversationId: string, message: MessageEntity) {
    this.server
      .to(this.conversationRoom(conversationId))
      .emit('newMessage', message);

    const participantIds = [
      message.conversation.participantOne.id,
      message.conversation.participantTwo.id,
    ];

    for (const userId of participantIds) {
      this.server.to(this.userRoom(userId)).emit('conversationUpdated', {
        conversationId,
        lastMessage: message,
      });
    }
  }

  private extractToken(client: Socket): string {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    const fromHeader = client.handshake.headers.authorization?.replace(
      'Bearer ',
      '',
    );
    const token = fromAuth ?? fromHeader;

    if (!token) {
      throw new Error('Token nije prosleđen');
    }

    return token;
  }

  private conversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }
}
