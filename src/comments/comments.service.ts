import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentEntity } from './comments.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from 'src/posts/post.entity';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/users.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/notification.entity';
import { CommunitiesService } from 'src/communities/communities.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepository: Repository<PostEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentsRepository: Repository<CommentEntity>,
    private readonly notificationsService: NotificationsService,
    private readonly communitiesService: CommunitiesService,
  ) {}

  async create(
    postId: string,
    dto: CreateCommentDto,
    userId: string,
  ): Promise<CommentEntity> {
    const post = await this.postsRepository.findOne({
      where: { id: postId },
      relations: { author: true },
    });
    if (post === null) {
      throw new NotFoundException('Post does not exist for provided id');
    }

    let parent: CommentEntity | null = null;

    if (dto.parentId) {
      parent = await this.commentsRepository.findOne({
        where: { id: dto.parentId },
        relations: { post: true, author: true },
      });

      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parent.post.id !== postId) {
        throw new BadRequestException(
          'Parent comment does not belong to this post',
        );
      }
    }

    const comment = this.commentsRepository.create({
      content: dto.content,
      author: { id: userId } as UserEntity,
      post: { id: postId } as PostEntity,
      parent: parent ?? undefined,
    });

    const savedComment = await this.commentsRepository.save(comment);

    if (parent) {
      if (parent.author.id !== userId) {
        await this.notificationsService.create({
          recipientId: parent.author.id,
          actorId: userId,
          type: NotificationType.NEW_REPLY,
          postId,
        });
      }
    } else {
      if (post.author.id !== userId) {
        await this.notificationsService.create({
          recipientId: post.author.id,
          actorId: userId,
          type: NotificationType.NEW_COMMENT,
          postId,
        });
      }
    }

    return savedComment;
  }

  async findByPost(postId: string): Promise<CommentEntity[]> {
    return await this.commentsRepository.find({
      where: { post: { id: postId } },
      relations: { author: true, parent: true },
      select: {
        author: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      order: { createdAt: 'ASC' },
    });
  }
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: { author: true, post: { community: true } },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (userId !== comment.author.id) {
      await this.communitiesService.requireModeratorOrOwner(
        comment.post.community.id,
        userId,
      );
    }

    await this.commentsRepository.delete({ id: commentId });
  }
}
