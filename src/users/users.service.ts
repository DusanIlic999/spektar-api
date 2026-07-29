import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './users.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async createUser(userData: CreateUserDto): Promise<UserEntity> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    const newUser = this.usersRepository.create({
      email: userData.email,
      username: userData.username,
      displayName: userData.displayName,
      passwordHash: hashedPassword,
    });

    try {
      return await this.usersRepository.save(newUser);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('Email or username already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<UserEntity[]> {
    return await this.usersRepository.find();
  }

  async findByEmail(email: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOneBy({ email });
    if (user === null) {
      throw new NotFoundException(`Invalid Credidentials`);
    }
    return user;
  }

  async findByEmailOrNull(email: string): Promise<UserEntity | null> {
    return await this.usersRepository.findOneBy({ email });
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOneBy({ id });
    if (user === null) {
      throw new NotFoundException(`Did not find the user with id ${id}`);
    }
    return user;
  }
}
