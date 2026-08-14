import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ConversationEntity } from './conversation.entity';
import { MessageEntity } from './message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationsRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messagesRepository: Repository<MessageEntity>,
  ) {}

  async findOrCreateConversation(
    userId: string,
    recipientId: string,
  ): Promise<ConversationEntity> {
    if (userId === recipientId) {
      throw new ForbiddenException('Ne možeš započeti razgovor sa samim sobom');
    }

    const [participantOneId, participantTwoId] = [userId, recipientId].sort();

    const existing = await this.conversationsRepository.findOne({
      where: {
        participantOne: { id: participantOneId },
        participantTwo: { id: participantTwoId },
      },
      relations: { participantOne: true, participantTwo: true },
    });

    if (existing) {
      return existing;
    }

    const conversation = this.conversationsRepository.create({
      participantOne: { id: participantOneId },
      participantTwo: { id: participantTwoId },
    });

    const saved = await this.conversationsRepository.save(conversation);
    return this.getConversationById(saved.id, userId);
  }

  async getConversationById(
    id: string,
    userId: string,
  ): Promise<ConversationEntity> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id },
      relations: { participantOne: true, participantTwo: true },
    });

    if (!conversation) {
      throw new NotFoundException('Razgovor nije pronađen');
    }

    this.assertParticipant(conversation, userId);
    return conversation;
  }

  assertParticipant(conversation: ConversationEntity, userId: string): void {
    if (
      conversation.participantOne.id !== userId &&
      conversation.participantTwo.id !== userId
    ) {
      throw new ForbiddenException('Nemaš pristup ovom razgovoru');
    }
  }

  getOtherParticipant(conversation: ConversationEntity, userId: string) {
    return conversation.participantOne.id === userId
      ? conversation.participantTwo
      : conversation.participantOne;
  }

  async findMyConversations(userId: string) {
    const conversations = await this.conversationsRepository.find({
      where: [
        { participantOne: { id: userId } },
        { participantTwo: { id: userId } },
      ],
      relations: { participantOne: true, participantTwo: true },
      order: { updatedAt: 'DESC' },
    });

    return Promise.all(
      conversations.map(async (conversation) => {
        const [lastMessage, unreadCount] = await Promise.all([
          this.messagesRepository.findOne({
            where: { conversation: { id: conversation.id } },
            relations: { sender: true },
            order: { createdAt: 'DESC' },
          }),
          this.messagesRepository.count({
            where: {
              conversation: { id: conversation.id },
              isRead: false,
              sender: { id: Not(userId) },
            },
          }),
        ]);

        return {
          id: conversation.id,
          otherParticipant: this.getOtherParticipant(conversation, userId),
          lastMessage,
          unreadCount,
          updatedAt: conversation.updatedAt,
        };
      }),
    );
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<MessageEntity> {
    const conversation = await this.getConversationById(
      conversationId,
      senderId,
    );

    const message = this.messagesRepository.create({
      conversation: { id: conversation.id },
      sender: { id: senderId },
      content,
    });

    const saved = await this.messagesRepository.save(message);

    await this.conversationsRepository.update(conversation.id, {
      updatedAt: new Date(),
    });

    return this.messagesRepository.findOneOrFail({
      where: { id: saved.id },
      relations: {
        sender: true,
        conversation: { participantOne: true, participantTwo: true },
      },
    });
  }

  async findMessages(
    conversationId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ messages: MessageEntity[]; hasMore: boolean }> {
    await this.getConversationById(conversationId, userId);

    const [messages, total] = await this.messagesRepository.findAndCount({
      where: { conversation: { id: conversationId } },
      relations: { sender: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      messages: messages.reverse(),
      hasMore: page * limit < total,
    };
  }

  findUnreadMessages = () => {
    return this.messagesRepository.findAndCount({
      where: { isRead: false },
    });
  };

  async markConversationAsRead(
    conversationId: string,
    userId: string,
  ): Promise<{ updated: number }> {
    const conversation = await this.getConversationById(conversationId, userId);

    const result = await this.messagesRepository.update(
      {
        conversation: { id: conversation.id },
        sender: { id: Not(userId) },
        isRead: false,
      },
      { isRead: true },
    );

    return { updated: result.affected ?? 0 };
  }
}
