import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../users/users.entity';
import { CommunityEntity } from './community.entity';

@Entity('community_invites')
@Unique(['invitedUser', 'community']) // korisnik moze imati samo jedan aktivan poziv po zajednici
export class CommunityInviteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CommunityEntity, { onDelete: 'CASCADE' })
  community!: CommunityEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  invitedUser!: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  invitedBy!: UserEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
