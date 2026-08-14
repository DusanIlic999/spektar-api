import { UserEntity } from 'src/users/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PostEntity } from '../posts/post.entity';

@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  content!: string;

  @ManyToOne(() => UserEntity)
  author!: UserEntity;

  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
  post!: PostEntity;

  @ManyToOne(() => CommentEntity, { nullable: true, onDelete: 'CASCADE' })
  parent?: CommentEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
