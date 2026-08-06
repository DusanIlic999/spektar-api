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
import { CommunityJoinRequestEntity } from './community-join-request.entity';
import { CommunityInviteEntity } from './community-invite.entity';
import { PostEntity } from '../posts/post.entity';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { UserEntity } from '../users/users.entity';
import { ImageKitService } from '../imagekit/imagekit.service';
import { UsersService } from 'src/users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class CommunitiesService {
  constructor(
    @InjectRepository(CommunityEntity)
    private readonly communitiesRepository: Repository<CommunityEntity>,
    @InjectRepository(CommunityMemberEntity)
    private readonly membersRepository: Repository<CommunityMemberEntity>,
    @InjectRepository(CommunityJoinRequestEntity)
    private readonly joinRequestsRepository: Repository<CommunityJoinRequestEntity>,
    @InjectRepository(CommunityInviteEntity)
    private readonly invitesRepository: Repository<CommunityInviteEntity>,
    private readonly imageKitService: ImageKitService,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly notificationsService: NotificationsService,
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
    const pendingRequest =
      userId && !isMember
        ? await this.joinRequestsRepository.findOne({
            where: { community: { id: community.id }, user: { id: userId } },
          })
        : null;
    community.memberCount = parseInt(raw[0].community_memberCount, 10);
    community.postCount = parseInt(raw[0].community_postCount, 10);
    community.currentMember = isMember ? true : false;
    community.hasPendingJoinRequest = pendingRequest ? true : false;
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
  ): Promise<CommunityMemberEntity | CommunityJoinRequestEntity> {
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

    if (communityExists.type === CommunityType.RESTRICTED) {
      const existingRequest = await this.joinRequestsRepository.findOne({
        where: { community: { id: communityId }, user: { id: userId } },
      });

      if (existingRequest) {
        throw new ConflictException(
          'A join request for this community is already pending',
        );
      }

      const joinRequest = this.joinRequestsRepository.create({
        user: { id: userId } as UserEntity,
        community: communityExists,
      });

      return this.joinRequestsRepository.save(joinRequest);
    }

    const membership = this.membersRepository.create({
      user: { id: userId } as UserEntity,
      community: communityExists,
      role: MemberRole.MEMBER,
    });

    return this.membersRepository.save(membership);
  }

  async findJoinRequests(
    communityId: string,
    requesterId: string,
  ): Promise<CommunityJoinRequestEntity[]> {
    await this.requireModeratorOrOwner(communityId, requesterId);

    return this.joinRequestsRepository.find({
      where: { community: { id: communityId } },
      relations: { user: true },
      select: {
        id: true,
        createdAt: true,
        user: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findMyJoinRequests(userId: string): Promise<string[]> {
    const requests = await this.joinRequestsRepository.find({
      where: { user: { id: userId } },
      relations: { community: true },
      select: { id: true, community: { id: true } },
    });

    return requests.map((request) => request.community.id);
  }

  async findMyJoinRequest(
    communityId: string,
    userId: string,
  ): Promise<CommunityJoinRequestEntity | null> {
    return this.joinRequestsRepository.findOne({
      where: { community: { id: communityId }, user: { id: userId } },
    });
  }

  async approveJoinRequest(
    communityId: string,
    requestId: string,
    requesterId: string,
  ): Promise<CommunityMemberEntity> {
    await this.requireModeratorOrOwner(communityId, requesterId);

    const joinRequest = await this.joinRequestsRepository.findOne({
      where: { id: requestId, community: { id: communityId } },
      relations: { user: true, community: true },
      select: {
        id: true,
        user: { id: true },
        community: { id: true },
      },
    });

    if (!joinRequest) {
      throw new NotFoundException('Join request not found');
    }

    const membership = this.membersRepository.create({
      user: joinRequest.user,
      community: joinRequest.community,
      role: MemberRole.MEMBER,
    });

    const savedMembership = await this.membersRepository.save(membership);
    await this.joinRequestsRepository.delete({ id: joinRequest.id });

    return savedMembership;
  }

  async rejectJoinRequest(
    communityId: string,
    requestId: string,
    requesterId: string,
  ): Promise<void> {
    await this.requireModeratorOrOwner(communityId, requesterId);

    const joinRequest = await this.joinRequestsRepository.findOne({
      where: { id: requestId, community: { id: communityId } },
    });

    if (!joinRequest) {
      throw new NotFoundException('Join request not found');
    }

    await this.joinRequestsRepository.delete({ id: joinRequest.id });
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

    const targetMembership = await this.findMembership(
      communityId,
      targetUserId,
    );

    if (
      !requesterMembership ||
      requesterMembership.role === MemberRole.MEMBER
    ) {
      throw new ForbiddenException(
        'Only the owner and moderator can change member roles',
      );
    }

    if (!targetMembership) {
      throw new NotFoundException('This user is not a member of the community');
    }
    if (targetMembership.role === MemberRole.OWNER) {
      throw new ForbiddenException('You cant change owner role');
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

  async deleteCommunity(
    communityId: string,
    requesterId: string,
  ): Promise<void> {
    const requesterMembership = await this.requireModeratorOrOwner(
      communityId,
      requesterId,
    );

    const isCommunity = await this.findById(communityId);

    if (!isCommunity) {
      throw new NotFoundException('This is not a valid community');
    }

    if (requesterMembership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only the owner can delete this community');
    }

    await this.communitiesRepository.delete({ id: isCommunity.id });
  }

  async inviteMember(
    communityId: string,
    username: string,
    inviterId: string,
  ): Promise<CommunityInviteEntity> {
    await this.findById(communityId);
    await this.requireModeratorOrOwner(communityId, inviterId);

    const invitedUser = await this.userService.findByUsernameOrNull(username);
    if (!invitedUser) {
      throw new NotFoundException('User not found');
    }

    const existingMembership = await this.findMembership(
      communityId,
      invitedUser.id,
    );
    if (existingMembership) {
      throw new ConflictException('User is already a member of this community');
    }

    const existingInvite = await this.invitesRepository.findOne({
      where: {
        community: { id: communityId },
        invitedUser: { id: invitedUser.id },
      },
    });
    if (existingInvite) {
      throw new ConflictException('An invite for this user is already pending');
    }

    const invite = this.invitesRepository.create({
      community: { id: communityId } as CommunityEntity,
      invitedUser,
      invitedBy: { id: inviterId } as UserEntity,
    });

    const savedInvite = await this.invitesRepository.save(invite);

    await this.notificationsService.create({
      recipientId: invitedUser.id,
      actorId: inviterId,
      type: NotificationType.COMMUNITY_INVITE,
      communityId,
    });

    return savedInvite;
  }

  async findInvitableUsers(
    communityId: string,
    requesterId: string,
  ): Promise<UserEntity[]> {
    await this.requireModeratorOrOwner(communityId, requesterId);

    const [members, invites] = await Promise.all([
      this.membersRepository.find({
        where: { community: { id: communityId } },
        relations: { user: true },
        select: { user: { id: true } },
      }),
      this.invitesRepository.find({
        where: { community: { id: communityId } },
        relations: { invitedUser: true },
        select: { invitedUser: { id: true } },
      }),
    ]);

    const excludedIds = [
      ...members.map((member) => member.user.id),
      ...invites.map((invite) => invite.invitedUser.id),
    ];

    return this.userService.findAllExcluding(excludedIds);
  }

  async findInvites(
    communityId: string,
    requesterId: string,
  ): Promise<CommunityInviteEntity[]> {
    await this.requireModeratorOrOwner(communityId, requesterId);

    return this.invitesRepository.find({
      where: { community: { id: communityId } },
      relations: { invitedUser: true, invitedBy: true },
      select: {
        id: true,
        createdAt: true,
        invitedUser: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
        invitedBy: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findMyInvites(userId: string): Promise<CommunityInviteEntity[]> {
    return this.invitesRepository.find({
      where: { invitedUser: { id: userId } },
      relations: { community: true, invitedBy: true },
      select: {
        id: true,
        createdAt: true,
        community: true,
        invitedBy: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findMyInvite(
    communityId: string,
    userId: string,
  ): Promise<CommunityInviteEntity | null> {
    return this.invitesRepository.findOne({
      where: { community: { id: communityId }, invitedUser: { id: userId } },
    });
  }

  async acceptInvite(
    communityId: string,
    inviteId: string,
    userId: string,
  ): Promise<CommunityMemberEntity> {
    const invite = await this.invitesRepository.findOne({
      where: { id: inviteId, community: { id: communityId } },
      relations: { invitedUser: true, community: true },
      select: {
        id: true,
        invitedUser: { id: true },
        community: { id: true },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.invitedUser.id !== userId) {
      throw new ForbiddenException('This invite does not belong to you');
    }

    const membership = this.membersRepository.create({
      user: invite.invitedUser,
      community: invite.community,
      role: MemberRole.MEMBER,
    });

    const savedMembership = await this.membersRepository.save(membership);
    await this.invitesRepository.delete({ id: invite.id });

    return savedMembership;
  }

  async declineInvite(
    communityId: string,
    inviteId: string,
    userId: string,
  ): Promise<void> {
    const invite = await this.invitesRepository.findOne({
      where: { id: inviteId, community: { id: communityId } },
      relations: { invitedUser: true },
      select: {
        id: true,
        invitedUser: { id: true },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.invitedUser.id !== userId) {
      throw new ForbiddenException('This invite does not belong to you');
    }

    await this.invitesRepository.delete({ id: invite.id });
  }

  async revokeInvite(
    communityId: string,
    inviteId: string,
    requesterId: string,
  ): Promise<void> {
    await this.requireModeratorOrOwner(communityId, requesterId);

    const invite = await this.invitesRepository.findOne({
      where: { id: inviteId, community: { id: communityId } },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    await this.invitesRepository.delete({ id: invite.id });
  }
}
