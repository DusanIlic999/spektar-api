import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';
import { VoteDto } from './dto/vote.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreatePostDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    image: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    return this.postsService.create(dto, req.user.userId, image);
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

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') postId: string, @Req() req: any) {
    return this.postsService.findById(postId, req.user?.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('communities/:slug/posts')
  async findByCommunity(@Param('slug') slug: string, @Req() req: any) {
    return this.postsService.findByCommunity(slug, req.user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  async toggleSave(@Param('id') postId: string, @Req() req: any) {
    return this.postsService.toggleSave(postId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePost(@Param('id') postId: string, @Req() req: any) {
    await this.postsService.deletePost(postId, req.user.userId);
    return { success: true };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('public/all')
  async findAllPublicPosts(@Req() req: any) {
    return await this.postsService.findFromPublic(req.user?.userId);
  }
}
