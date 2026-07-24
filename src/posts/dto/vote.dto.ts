import { IsIn } from 'class-validator';

export class VoteDto {
  @IsIn([1, -1])
  value!: number;
}