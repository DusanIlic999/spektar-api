import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../users/users.entity';
import { CommunityEntity } from './community.entity';

export enum MemberRole {
  OWNER = 'owner',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

@Entity('community_members')
@Unique(['user', 'community']) // sprečava da isti user bude dvaput član iste zajednice
export class CommunityMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user!: UserEntity;

  @ManyToOne(() => CommunityEntity, { onDelete: 'CASCADE' })
  community!: CommunityEntity;

  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.MEMBER })
  role!: MemberRole;

  @CreateDateColumn()
  joinedAt!: Date;
}
