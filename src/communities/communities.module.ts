import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';
import { CommunityEntity } from './community.entity';
import { CommunityMemberEntity } from './community-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommunityEntity, CommunityMemberEntity])],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
