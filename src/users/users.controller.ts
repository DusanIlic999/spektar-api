import {
  Body,
  Controller,
  forwardRef,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PostsService } from 'src/posts/posts.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => PostsService))
    private readonly postsService: PostsService,
  ) {}
  @Post('/')
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    const { passwordHash, ...result } = user;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req) {
    const user = await this.usersService.findByEmail(req.user.email);
    const posts = await this.postsService.findByAuthor(user.id);
    const { passwordHash, ...result } = user;
    return { ...result, posts };
  }

  @UseGuards(JwtAuthGuard)
  @Get('/')
  async getAll() {
    return await this.usersService.findAll();
  }
}
