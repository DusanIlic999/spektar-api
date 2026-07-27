import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: any,
  ) {
    return this.commentsService.create(postId, dto, req.user.userId);
  }

  @Get()
  async findByPost(@Param('postId') postId: string) {
    return await this.commentsService.findByPost(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':commentId')
  async deleteComment(@Param('commentId') commentId: string, @Req() req: any) {
    await this.commentsService.deleteComment(commentId, req.user.userId);
    return { success: true };
  }
}
