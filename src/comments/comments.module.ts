import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PostEntity } from '../posts/post.entity';
import { CommentEntity } from './comments.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { CommunitiesModule } from 'src/communities/communities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommentEntity, PostEntity]),
    NotificationsModule,
    CommunitiesModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
