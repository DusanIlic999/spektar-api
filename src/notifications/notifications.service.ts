import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity, NotificationType } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepository: Repository<NotificationEntity>,
  ) {}

  async create(data: {
    recipientId: string;
    actorId: string;
    type: NotificationType;
    postId?: string;
    communityId?: string;
  }): Promise<NotificationEntity> {
    const notification = this.notificationsRepository.create({
      recipient: { id: data.recipientId },
      actor: { id: data.actorId },
      type: data.type,
      post: data.postId ? { id: data.postId } : undefined,
      community: data.communityId ? { id: data.communityId } : undefined,
    });

    return this.notificationsRepository.save(notification);
  }

  async findByRecipient(userId: string): Promise<NotificationEntity[]> {
    return this.notificationsRepository.find({
      where: { recipient: { id: userId } },
      relations: { actor: true, post: true, community: true },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<NotificationEntity> {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
      relations: { recipient: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipient.id !== userId) {
      throw new ForbiddenException('This notification does not belong to you');
    }

    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }
}
