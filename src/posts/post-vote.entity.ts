import { UserEntity } from 'src/users/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PostEntity } from './post.entity';

@Entity('postVote')
@Unique(['user', 'post'])
export class PostVoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity)
  user!: UserEntity;

  @ManyToOne(() => PostEntity)
  post!: PostEntity;

  @Column({ type: 'int' })
  value!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
