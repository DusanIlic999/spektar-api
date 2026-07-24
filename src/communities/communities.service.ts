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
}
