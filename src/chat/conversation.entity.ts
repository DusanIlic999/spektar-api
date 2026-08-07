import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/users.entity';

@Entity('conversations')
@Unique(['participantOne', 'participantTwo'])
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  participantOne!: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  participantTwo!: UserEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
