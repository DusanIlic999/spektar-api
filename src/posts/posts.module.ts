import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from './post.entity';
import { PostVoteEntity } from './post-vote.entity';
import { CommentEntity } from '../comments/comments.entity';
import { SavedPostEntity } from './saved-post.entity';
import { CommunitiesModule } from '../communities/communities.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PostEntity,
      PostVoteEntity,
      CommentEntity,
      SavedPostEntity,
    ]),
    CommunitiesModule,
    UsersModule,
  ],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
