import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('conversations')
  async startConversation(
    @Body() dto: StartConversationDto,
    @Req() req: any,
  ) {
    return this.chatService.findOrCreateConversation(
      req.user.userId,
      dto.recipientId,
    );
  }

  @Get('conversations')
  async findMyConversations(@Req() req: any) {
    return this.chatService.findMyConversations(req.user.userId);
  }

  @Get('conversations/:id/messages')
  async findMessages(
    @Param('id') id: string,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req: any,
  ) {
    return this.chatService.findMessages(
      id,
      req.user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 30,
    );
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req: any,
  ) {
    const message = await this.chatService.sendMessage(
      id,
      req.user.userId,
      dto.content,
    );

    this.chatGateway.emitNewMessage(id, message);

    return message;
  }

  @Patch('conversations/:id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.chatService.markConversationAsRead(id, req.user.userId);
  }
}
