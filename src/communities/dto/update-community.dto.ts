import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CommunityCategory, CommunityType } from '../community.entity';

export class UpdateCommunityDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(CommunityType)
  type?: CommunityType;

  @IsOptional()
  @IsEnum(CommunityCategory)
  category?: string;
}
