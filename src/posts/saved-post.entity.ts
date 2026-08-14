import { UserEntity } from 'src/users/users.entity';
import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PostEntity } from './post.entity';

@Unique(['user', 'post'])
@Entity('savedPosts')
export class SavedPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity)
  user!: UserEntity;

  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
  post!: PostEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
