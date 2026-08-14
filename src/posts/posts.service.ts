import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { PostEntity } from './post.entity';
import { CommunitiesService } from '../communities/communities.service';
import {
  CommunityEntity,
  CommunityType,
} from '../communities/community.entity';
import { UserEntity } from '../users/users.entity';
import { UsersService } from 'src/users/users.service';
import { PostVoteEntity } from './post-vote.entity';
import { SavedPostEntity } from './saved-post.entity';
import { ImageKitService } from '../imagekit/imagekit.service';

export type CommunityWithMembership = CommunityEntity & { isMember: boolean };

export type PostResponse = Omit<PostEntity, 'community'> & {
  saved: boolean;
  community: CommunityWithMembership;
};

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

  async findById(
    postId: string,
    userId?: string,
  ): Promise<PostEntity & { saved: boolean }> {
    const post = await this.postsRepository.findOne({
      where: { id: postId },
      relations: { author: true, community: true },
      select: {
        author: {
          id: true,
          displayName: true,
          avatarUrl: true,
          username: true,
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const [postWithSaved] = await this.attachSavedFlag([post], userId);
    return postWithSaved;
  }

  private async attachSavedFlag<T extends PostEntity>(
    posts: T[],
    userId?: string,
  ): Promise<(T & { saved: boolean })[]> {
    if (!userId || posts.length === 0) {
      return posts.map((post) => ({ ...post, saved: false }));
    }

    const savedRows = await this.savedPostsRepository.find({
      where: {
        user: { id: userId },
        post: { id: In(posts.map((post) => post.id)) },
      },
      relations: { post: true },
    });

    const savedPostIds = new Set(savedRows.map((row) => row.post.id));

    return posts.map((post) => ({
      ...post,
      saved: savedPostIds.has(post.id),
    }));
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

    const uploadedImage = image
      ? await this.imageKitService.uploadImage(image, '/posts')
      : undefined;

    const post = this.postsRepository.create({
      title: dto.title,
      content: dto.content,
      type: dto.type,
      imageUrl: uploadedImage?.url,
      imageFileId: uploadedImage?.fileId,
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

  async findByCommunity(
    slug: string,
    userId?: string,
  ): Promise<PostResponse[]> {
    const community = await this.communitiesService.findBySlug(slug);

    const isMember = userId
      ? Boolean(
          await this.communitiesService.findMembership(community.id, userId),
        )
      : false;

    if (community.type !== CommunityType /*  */.PUBLIC && !isMember) {
      throw new ForbiddenException(
        userId
          ? 'You must be a member of this community to view its posts'
          : 'You must be logged in to view this community',
      );
    }

    const posts = await this.postsRepository.find({
      where: { community: { id: community.id } },
      relations: { author: true, community: true },
      select: {
        author: {
          id: true,
          displayName: true,
          avatarUrl: true,
          username: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    const withSaved = await this.attachSavedFlag(posts, userId);

    return withSaved.map((post) => ({
      ...post,
      community: { ...post.community, isMember },
    }));
  }

  async findByAuthor(
    authorId: string,
    viewerId?: string,
  ): Promise<(PostEntity & { saved: boolean })[]> {
    const posts = await this.postsRepository.find({
      where: { author: { id: authorId } },
      relations: { author: true, community: true },
      select: {
        author: {
          id: true,
          displayName: true,
          avatarUrl: true,
          username: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    return this.attachSavedFlag(posts, viewerId);
  }

  async findPublicAndUsers(
    userId?: string,
  ): Promise<(PostEntity & { saved: boolean })[]> {
    const where: FindOptionsWhere<PostEntity>[] = [
      { community: { type: CommunityType.PUBLIC } },
    ];

    if (userId) {
      const memberCommunities =
        await this.communitiesService.findByMember(userId);
      const memberCommunityIds = memberCommunities.map(
        (community) => community.id,
      );

      if (memberCommunityIds.length > 0) {
        where.push({ community: { id: In(memberCommunityIds) } });
      }
    }

    const posts = await this.postsRepository.find({
      where,
      relations: { author: true, community: true },
      select: {
        author: {
          id: true,
          displayName: true,
          avatarUrl: true,
          username: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    return this.attachSavedFlag(posts, userId);
  }

  async findSaved(
    userId: string,
  ): Promise<(PostEntity & { saved: boolean })[]> {
    const savedRows = await this.savedPostsRepository.find({
      where: { user: { id: userId } },
      relations: { post: { author: true, community: true } },
      select: {
        post: {
          id: true,
          title: true,
          content: true,
          type: true,
          imageUrl: true,
          imageFileId: true,
          upvoteCount: true,
          downvoteCount: true,
          createdAt: true,
          author: {
            id: true,
            displayName: true,
            avatarUrl: true,
            username: true,
          },
          community: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    return savedRows.map((row) => ({ ...row.post, saved: true }));
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
      post.saved = false;
      await this.postsRepository.save(post);
      await this.savedPostsRepository.delete({ id: existingSave.id });
      return { saved: false };
    } else {
      post.saved = true;
      await this.postsRepository.save(post);
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
    await this.imageKitService.deleteImage(post.imageFileId);
  }
}
