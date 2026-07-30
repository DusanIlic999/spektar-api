import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
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

  @Get('/public')
  async findPublic() {
    return this.communitiesService.findPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findMine(@Req() req: any) {
    return this.communitiesService.findByMember(req.user.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string, @Req() req: any) {
    return this.communitiesService.findBySlug(slug, req.user?.userId);
  }

  @Get(':slug/members')
  async findMembers(@Param('slug') slug: string) {
    return this.communitiesService.findMembers(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async join(@Param('id') communityId: string, @Req() req: any) {
    return this.communitiesService.join(communityId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/disband')
  async disband(@Param('id') communityId: string, @Req() req: any) {
    return this.communitiesService.disband(communityId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommunityDto,
    @Req() req: any,
  ) {
    return this.communitiesService.update(id, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  async updateImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    image: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.communitiesService.updateImage(id, image, req.user.userId);
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
