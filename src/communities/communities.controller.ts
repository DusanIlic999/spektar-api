import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MemberRole } from './community-member.entity';

@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateCommunityDto, @Req() req: any) {
    return this.communitiesService.create(dto, req.user.userId);
  }

  @Get()
  async findAll() {
    return this.communitiesService.findAll();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.communitiesService.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async join(@Param('id') communityId: string, @Req() req: any) {
    return this.communitiesService.join(communityId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':communityId/members/:userId/role')
  async changeRole(
    @Param('communityId') communityId: string,
    @Param('userId') targetUserId: string,
    @Body('role') role: MemberRole,
    @Req() req: any,
  ) {
    return this.communitiesService.changeRole(
      communityId,
      targetUserId,
      role,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':communityId/members/:userId')
  async removeMember(
    @Param('communityId') communityId: string,
    @Param('userId') targetUserId: string,
    @Req() req: any,
  ) {
    await this.communitiesService.removeMember(
      communityId,
      targetUserId,
      req.user.userId,
    );
    return { success: true };
  }
}
