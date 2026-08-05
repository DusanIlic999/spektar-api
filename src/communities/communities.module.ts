import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';
import { CommunityEntity } from './community.entity';
import { CommunityMemberEntity } from './community-member.entity';
import { CommunityJoinRequestEntity } from './community-join-request.entity';
import { ImageKitModule } from '../imagekit/imagekit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunityEntity,
      CommunityMemberEntity,
      CommunityJoinRequestEntity,
    ]),
    ImageKitModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
