import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  forwardRef,
  Get,
  Inject,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { PostsService } from 'src/posts/posts.service';
import { EditUserDto } from './dto/edit-user.dto';

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
    const posts = await this.postsService.findByAuthor(
      user.id,
      req.user.userId,
    );
    const { passwordHash, ...result } = user;
    return { ...result, posts };
  }

  @Get('/')
  async getAll() {
    const users = await this.usersService.findAll();
    const withoutPasswordHash = users.map(({ passwordHash, ...rest }) => rest);
    return withoutPasswordHash;
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':username')
  async getByUsername(@Param('username') username: string, @Req() req) {
    const user = await this.usersService.findByUsername(username);
    const posts = await this.postsService.findByAuthor(
      user.id,
      req.user?.userId,
    );
    const { passwordHash, ...rest } = user;
    return { ...rest, posts };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/')
  async delete(@Req() req) {
    await this.usersService.delete(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('/')
  @UseInterceptors(FileInterceptor('image'))
  async edit(
    @Req() req,
    @Body() userData: EditUserDto,
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
  ) {
    return this.usersService.edit(req.user.userId, userData, image);
  }
}
