import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { PostEntity } from './post.entity';
import { CommunitiesService } from '../communities/communities.service';
import { CommunityType } from '../communities/community.entity';
import { UserEntity } from '../users/users.entity';
import { UsersService } from 'src/users/users.service';
import { PostVoteEntity } from './post-vote.entity';
import { SavedPostEntity } from './saved-post.entity';
import { ImageKitService } from '../imagekit/imagekit.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepository: Repository<PostEntity>,
    @InjectRepository(PostVoteEntity)
    private readonly postVotesRepository: Repository<PostVoteEntity>,
    @InjectRepository(SavedPostEntity)
    private readonly savedPostsRepository: Repository<SavedPostEntity>,
    private readonly communitiesService: CommunitiesService,
    private readonly usersService: UsersService,
    private readonly imageKitService: ImageKitService,
  ) {}

  async findById(postId: string): Promise<PostEntity> {
    const post = await this.postsRepository.findOne({
      where: { id: postId },
      relations: { author: true, community: true },
      select: {
        author: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }
  async create(
    dto: CreatePostDto,
    userId: string,
    image?: Express.Multer.File,
  ): Promise<PostEntity> {
    const community = await this.communitiesService.findById(dto.communityId);

    const author = await this.usersService.findById(userId);

    const { displayName, avatarUrl, id } = author;

    const membership = await this.communitiesService.findMembership(
      community.id,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException(
        'You must be a member of this community to post',
      );
    }

    const imageUrl = image
      ? await this.imageKitService.uploadImage(image, '/posts')
      : undefined;

    const post = this.postsRepository.create({
      title: dto.title,
      content: dto.content,
      type: dto.type,
      imageUrl,
      author: { id, avatarUrl, displayName } as UserEntity,
      community,
    });

    return this.postsRepository.save(post);
  }

  async vote(postId: string, userId: string, value: number): Promise<void> {
    const post = await this.postsRepository.findOneBy({ id: postId });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existingVote = await this.postVotesRepository.findOne({
      where: { post: { id: postId }, user: { id: userId } },
    });

    if (!existingVote) {
      const newVote = this.postVotesRepository.create({
        post: { id: postId } as PostEntity,
        user: { id: userId } as UserEntity,
        value,
      });
      await this.postVotesRepository.save(newVote);

      const field = value === 1 ? 'upvoteCount' : 'downvoteCount';
      await this.postsRepository.increment({ id: postId }, field, 1);
      return;
    }

    if (existingVote.value === value) {
      await this.postVotesRepository.delete({ id: existingVote.id });

      const field = value === 1 ? 'upvoteCount' : 'downvoteCount';
      await this.postsRepository.decrement({ id: postId }, field, 1);
      return;
    }

    const oldField = existingVote.value === 1 ? 'upvoteCount' : 'downvoteCount';
    const newField = value === 1 ? 'upvoteCount' : 'downvoteCount';

    existingVote.value = value;
    await this.postVotesRepository.save(existingVote);

    await this.postsRepository.decrement({ id: postId }, oldField, 1);
    await this.postsRepository.increment({ id: postId }, newField, 1);
  }

  async findByCommunity(slug: string, userId?: string): Promise<PostEntity[]> {
    const community = await this.communitiesService.findBySlug(slug);

    if (community.type !== CommunityType.PUBLIC) {
      if (!userId) {
        throw new ForbiddenException(
          'You must be logged in to view this community',
        );
      }

      const membership = await this.communitiesService.findMembership(
        community.id,
        userId,
      );

      if (!membership) {
        throw new ForbiddenException(
          'You must be a member of this community to view its posts',
        );
      }
    }

    return await this.postsRepository.find({
      where: { community: { slug: slug } },
      relations: { author: true, community: true },
      select: {
        author: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async toggleSave(
    postId: string,
    userId: string,
  ): Promise<{ saved: boolean }> {
    const post = await this.postsRepository.findOneBy({ id: postId });
    if (post === null) {
      throw new NotFoundException('Post not found for provided id.');
    }
    const existingSave = await this.savedPostsRepository.findOne({
      where: {
        post: { id: postId },
        user: { id: userId },
      },
    });
    if (existingSave) {
      await this.savedPostsRepository.delete({ id: existingSave.id });
      return { saved: false };
    } else {
      const newSave = this.savedPostsRepository.create({
        post: { id: postId } as PostEntity,
        user: { id: userId } as UserEntity,
      });
      await this.savedPostsRepository.save(newSave);
      return { saved: true };
    }
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.postsRepository.findOne({
      where: { id: postId },
      relations: { author: true, community: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (userId !== post.author.id) {
      await this.communitiesService.requireModeratorOrOwner(
        post.community.id,
        userId,
      );
    }

    await this.postsRepository.delete({ id: postId });
  }
}
