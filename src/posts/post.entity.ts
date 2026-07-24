import { CommunityEntity } from 'src/communities/community.entity';
import { UserEntity } from 'src/users/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EPostType {
  ANNOUNCEMENT = 'announcement',
  GUIDE = 'guide',
  EVENT = 'event',
  DISCUSSION = 'discussion',
  PHOTO = 'photo',
}

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: EPostType,
    default: EPostType.ANNOUNCEMENT,
  })
  type!: EPostType;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl?: string;

  @ManyToOne(() => UserEntity)
  author!: UserEntity;

  @ManyToOne(() => CommunityEntity)
  community!: CommunityEntity;

  @Column({ type: 'int', default: 0 })
  upvoteCount!: number;

  @Column({ type: 'int', default: 0 })
  downvoteCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
