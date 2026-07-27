import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CommunityCategory, CommunityType } from '../community.entity';

export class CreateCommunityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsNotEmpty()
  @IsEnum(CommunityType)
  type!: CommunityType;

  @IsNotEmpty()
  @IsEnum(CommunityCategory)
  category!: string;
}
