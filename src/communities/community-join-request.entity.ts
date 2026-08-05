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

@Entity('community_join_requests')
@Unique(['user', 'community']) // korisnik moze imati samo jedan aktivan zahtev po zajednici
export class CommunityJoinRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user!: UserEntity;

  @ManyToOne(() => CommunityEntity, { onDelete: 'CASCADE' })
  community!: CommunityEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
