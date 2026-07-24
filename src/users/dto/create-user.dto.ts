import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(5)
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password!: string;

  @MinLength(5)
  @IsString()
  @IsNotEmpty()
  displayName!: string;
}
