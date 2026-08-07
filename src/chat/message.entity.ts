import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../users/users.entity';
import { ConversationEntity } from './conversation.entity';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ConversationEntity, { onDelete: 'CASCADE' })
  conversation!: ConversationEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  sender!: UserEntity;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
