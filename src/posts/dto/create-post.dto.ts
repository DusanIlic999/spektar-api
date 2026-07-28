import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { EPostType } from '../post.entity';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(EPostType)
  @IsNotEmpty()
  type!: EPostType;

  @IsString()
  @IsNotEmpty()
  communityId!: string;
}
