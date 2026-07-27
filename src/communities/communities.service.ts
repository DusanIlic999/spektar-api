import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityEntity, CommunityType } from './community.entity';
import { CommunityMemberEntity, MemberRole } from './community-member.entity';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UserEntity } from '../users/users.entity';

@Injectable()
export class CommunitiesService {
  constructor(
    @InjectRepository(CommunityEntity)
    private readonly communitiesRepository: Repository<CommunityEntity>,
    @InjectRepository(CommunityMemberEntity)
    private readonly membersRepository: Repository<CommunityMemberEntity>,
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
    return await this.communitiesRepository.find();
  }

  async findBySlug(slug: string): Promise<CommunityEntity> {
    const community = await this.communitiesRepository.findOneBy({ slug });
    if (!community) {
      throw new NotFoundException(`Community with slug "${slug}" not found`);
    }
    return community;
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

  async findById(id: string): Promise<CommunityEntity> {
    const community = await this.communitiesRepository.findOneBy({ id });
    if (!community) {
      throw new NotFoundException(`Community with id "${id}" not found`);
    }
    return community;
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
