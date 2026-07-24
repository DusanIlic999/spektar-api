import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';
import { VoteDto } from './dto/vote.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreatePostDto, @Req() req: any) {
    return this.postsService.create(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/vote')
  async vote(
    @Param('id') postId: string,
    @Body() dto: VoteDto,
    @Req() req: any,
  ) {
    await this.postsService.vote(postId, req.user.userId, dto.value);
    return { success: true };
  }

  @Get(':id')
  async findById(@Param('id') postId: string) {
    return this.postsService.findById(postId);
  }

  @Get('communities/:communityId/posts')
  async findByCommunity(@Param('communityId') communityId: string) {
    return this.postsService.findByCommunity(communityId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  async toggleSave(@Param('id') postId: string, @Req() req: any) {
    return this.postsService.toggleSave(postId, req.user.userId);
  }
}
