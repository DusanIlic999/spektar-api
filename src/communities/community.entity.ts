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

  @Column({ nullable: true })
  coverImageUrl?: string;

  @OneToMany(() => CommunityMemberEntity, (member) => member.community)
  members!: CommunityMemberEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
