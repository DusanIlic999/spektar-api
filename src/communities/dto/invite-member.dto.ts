import { IsNotEmpty, IsString } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  @IsNotEmpty()
  username!: string;
}
