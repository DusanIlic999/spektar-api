import { CommunityEntity } from 'src/communities/community.entity';
import { PostEntity } from 'src/posts/post.entity';
import { UserEntity } from 'src/users/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum NotificationType {
  NEW_COMMENT = 'new_comment',
  NEW_REPLY = 'new_reply',
  NEW_MEMBER = 'new_member',
  COMMUNITY_INVITE = 'community_invite',
}

@Entity('notification')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity)
  recipient!: UserEntity;

  @ManyToOne(() => UserEntity)
  actor!: UserEntity;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @ManyToOne(() => PostEntity, { nullable: true })
  post?: PostEntity;

  @ManyToOne(() => CommunityEntity, { nullable: true })
  community?: CommunityEntity;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
