import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommunityMemberEntity } from './community-member.entity';

export enum CommunityType {
  PUBLIC = 'public',
  RESTRICTED = 'restricted',
  PRIVATE = 'private',
}

export enum CommunityCategory {
  NEIGHBORHOOD = 'neightborhood',
  HOBBY = 'hobby',
  SPORT = 'sport',
  FOOD = 'food',
  EVENTS = 'events',
  REST = 'rest',
}

@Entity('communities')
export class CommunityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: CommunityType, default: CommunityType.PUBLIC })
  type!: CommunityType;

  @Column({
    type: 'enum',
    enum: CommunityCategory,
    default: CommunityCategory.NEIGHBORHOOD,
  })
  category!: string;

  @Column({ nullable: true })
  coverImageUrl?: string;

  @OneToMany(() => CommunityMemberEntity, (member) => member.community)
  members!: CommunityMemberEntity[];

  memberCount?: number;

  postCount?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
