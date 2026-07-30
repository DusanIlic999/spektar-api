import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityEntity, CommunityType } from './community.entity';
import { CommunityMemberEntity, MemberRole } from './community-member.entity';
import { PostEntity } from '../posts/post.entity';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { UserEntity } from '../users/users.entity';
import { ImageKitService } from '../imagekit/imagekit.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class CommunitiesService {
  constructor(
    @InjectRepository(CommunityEntity)
    private readonly communitiesRepository: Repository<CommunityEntity>,
    @InjectRepository(CommunityMemberEntity)
    private readonly membersRepository: Repository<CommunityMemberEntity>,
    private readonly imageKitService: ImageKitService,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
  ) {}

  private generateSlug(name: string): string {
    const diacriticsMap: Record<string, string> = {
      č: 'c',
      ć: 'c',
      š: 's',
      ž: 'z',
      đ: 'dj',
      Č: 'c',
      Ć: 'c',
      Š: 's',
      Ž: 'z',
      Đ: 'dj',
    };

    return name
      .split('')
      .map((char) => diacriticsMap[char] ?? char)
      .join('')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async create(
    dto: CreateCommunityDto,
    userId: string,
  ): Promise<CommunityEntity> {
    const slug = this.generateSlug(dto.name);

    const community = this.communitiesRepository.create({
      name: dto.name,
      description: dto.description,
      type: dto.type,
      slug,
    });

    let savedCommunity: CommunityEntity;

    try {
      savedCommunity = await this.communitiesRepository.save(community);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException(
          'A community with this name already exists',
        );
      }
      throw error;
    }

    const ownerMembership = this.membersRepository.create({
      user: { id: userId } as UserEntity,
      community: savedCommunity,
      role: MemberRole.OWNER,
    });
    await this.membersRepository.save(ownerMembership);

    return savedCommunity;
  }

  async findAll(): Promise<CommunityEntity[]> {
    const { entities, raw } = await this.communitiesRepository
      .createQueryBuilder('community')
      .addSelect(
        (qb) =>
          qb
            .subQuery()
            .select('COUNT(*)', 'count')
            .from(CommunityMemberEntity, 'member')
            .where('member.communityId = community.id'),
        'community_memberCount',
      )
      .addSelect(
        (qb) =>
          qb
            .subQuery()
            .select('COUNT(*)', 'count')
            .from(PostEntity, 'post')
            .where('post.communityId = community.id'),
        'community_postCount',
      )
      .getRawAndEntities();

    return entities.map((entity, index) => ({
      ...entity,
      memberCount: parseInt(raw[index].community_memberCount, 10),
      postCount: parseInt(raw[index].community_postCount, 10),
    }));
  }
  async findPublic(): Promise<CommunityEntity[]> {
    const { entities, raw } = await this.communitiesRepository
      .createQueryBuilder('community')
      .addSelect(
        (qb) =>
          qb
            .subQuery()
            .select('COUNT(*)', 'count')
            .from(CommunityMemberEntity, 'member')
            .where('member.communityId = community.id'),
        'community_memberCount',
      )
      .addSelect(
        (qb) =>
          qb
            .subQuery()
            .select('COUNT(*)', 'count')
            .from(PostEntity, 'post')
            .where('post.communityId = community.id'),
        'community_postCount',
      )
      .getRawAndEntities();

    return entities
      .map((entity, index) => ({
        ...entity,
        memberCount: parseInt(raw[index].community_memberCount, 10),
        postCount: parseInt(raw[index].community_postCount, 10),
      }))
      .filter((comm) => comm.type === CommunityType.PUBLIC);
  }

  async findBySlug(slug: string, userId?: string): Promise<CommunityEntity> {
    const { entities, raw } = await this.communitiesRepository
      .createQueryBuilder('community')
      .where('community.slug = :slug', { slug })
      .addSelect(
        (qb) =>
          qb
            .subQuery()
            .select('COUNT(*)', 'count')
            .from(CommunityMemberEntity, 'member')
            .where('member.communityId = community.id'),
        'community_memberCount',
      )
      .addSelect(
        (qb) =>
          qb
            .subQuery()
            .select('COUNT(*)', 'count')
            .from(PostEntity, 'post')
            .where('post.communityId = community.id'),
        'community_postCount',
      )
      .getRawAndEntities();

    const community = entities[0];
    if (!community) {
      throw new NotFoundException(`Community with slug "${slug}" not found`);
    }
    const isMember = userId
      ? await this.membersRepository.findOne({
          where: { community: { id: community.id }, user: { id: userId } },
          relations: { user: true, community: true },
        })
      : null;
    community.memberCount = parseInt(raw[0].community_memberCount, 10);
    community.postCount = parseInt(raw[0].community_postCount, 10);
    community.currentMember = isMember ? true : false;
    return community;
  }

  async findByMember(userId: string): Promise<CommunityEntity[]> {
    const memberships = await this.membersRepository.find({
      where: { user: { id: userId } },
      relations: { community: true },
    });

    return memberships.map((membership) => membership.community);
  }

  async findMembers(slug: string): Promise<CommunityMemberEntity[]> {
    await this.findBySlug(slug);

    return this.membersRepository.find({
      where: { community: { slug: slug } },
      relations: { user: true },
    });
  }

  async findMembership(
    communityId: string,
    userId: string,
  ): Promise<CommunityMemberEntity | null> {
    return this.membersRepository.findOne({
      where: { community: { id: communityId }, user: { id: userId } },
      relations: { user: true, community: true },
    });
  }

  async join(
    communityId: string,
    userId: string,
  ): Promise<CommunityMemberEntity> {
    const communityExists = await this.communitiesRepository.findOneBy({
      id: communityId,
    });

    if (!communityExists) {
      throw new NotFoundException('Community not found');
    }

    const member = await this.findMembership(communityId, userId);

    if (member !== null) {
      throw new ConflictException('User is already a member of this community');
    }

    if (communityExists.type === CommunityType.PRIVATE) {
      throw new ForbiddenException('Community is private.');
    }

    const membership = this.membersRepository.create({
      user: { id: userId } as UserEntity,
      community: communityExists,
      role: MemberRole.MEMBER,
    });

    return this.membersRepository.save(membership);
  }
  async disband(communityId: string, userId: string): Promise<void> {
    const communityExists = await this.communitiesRepository.findOneBy({
      id: communityId,
    });

    if (!communityExists) {
      throw new NotFoundException('Community not found');
    }

    const member = await this.findMembership(communityId, userId);

    if (member === null) {
      throw new NotFoundException('User is not a member of this community');
    }

    await this.membersRepository.delete({ id: member.id });
  }

  async findById(id: string): Promise<CommunityEntity> {
    const community = await this.communitiesRepository.findOneBy({ id });
    if (!community) {
      throw new NotFoundException(`Community with id "${id}" not found`);
    }
    return community;
  }

  async update(
    communityId: string,
    dto: UpdateCommunityDto,
    userId: string,
  ): Promise<CommunityEntity> {
    const community = await this.findById(communityId);
    await this.requireModeratorOrOwner(communityId, userId);

    Object.assign(community, dto);

    try {
      return await this.communitiesRepository.save(community);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException(
          'A community with this name already exists',
        );
      }
      throw error;
    }
  }

  async updateImage(
    communityId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<CommunityEntity> {
    const community = await this.findById(communityId);
    await this.requireModeratorOrOwner(communityId, userId);

    const oldFileId = community.coverImageFileId;
    const uploadedImage = await this.imageKitService.uploadImage(
      file,
      '/communities',
    );

    community.coverImageUrl = uploadedImage.url;
    community.coverImageFileId = uploadedImage.fileId;

    const saved = await this.communitiesRepository.save(community);
    await this.imageKitService.deleteImage(oldFileId);

    return saved;
  }

  async requireModeratorOrOwner(
    communityId: string,
    userId: string,
  ): Promise<CommunityMemberEntity> {
    const membership = await this.findMembership(communityId, userId);

    if (!membership) {
      throw new ForbiddenException('You are not a member of this community');
    }

    if (membership.role === MemberRole.MEMBER) {
      throw new ForbiddenException(
        'You must be a moderator or owner to do this',
      );
    }

    return membership;
  }
  async changeRole(
    communityId: string,
    targetUserId: string,
    newRole: MemberRole,
    requesterId: string,
  ): Promise<CommunityMemberEntity> {
    const requesterMembership = await this.findMembership(
      communityId,
      requesterId,
    );

    if (!requesterMembership || requesterMembership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only the owner can change member roles');
    }

    const targetMembership = await this.findMembership(
      communityId,
      targetUserId,
    );

    if (!targetMembership) {
      throw new NotFoundException('This user is not a member of the community');
    }

    targetMembership.role = newRole;
    return this.membersRepository.save(targetMembership);
  }
  async removeMember(
    communityId: string,
    targetUserId: string,
    requesterId: string,
  ): Promise<void> {
    const requesterMembership = await this.requireModeratorOrOwner(
      communityId,
      requesterId,
    );

    const targetMembership = await this.findMembership(
      communityId,
      targetUserId,
    );

    if (!targetMembership) {
      throw new NotFoundException('This user is not a member of the community');
    }

    if (
      targetMembership.role !== MemberRole.MEMBER &&
      requesterMembership.role !== MemberRole.OWNER
    ) {
      throw new ForbiddenException(
        'Only the owner can remove a moderator or another owner',
      );
    }

    await this.membersRepository.delete({ id: targetMembership.id });
  }
}
