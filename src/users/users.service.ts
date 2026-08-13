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
import { ImageKitService } from 'src/imagekit/imagekit.service';
import { EditUserDto } from './dto/edit-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private readonly imageKitService: ImageKitService,
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

  async findByUsername(username: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOneBy({ username });
    if (user === null) {
      throw new NotFoundException(`Invalid Credidentials`);
    }
    return user;
  }

  async findByEmailOrNull(email: string): Promise<UserEntity | null> {
    return await this.usersRepository.findOneBy({ email });
  }

  async findByUsernameOrNull(username: string): Promise<UserEntity | null> {
    return await this.usersRepository.findOneBy({ username });
  }

  async findAllExcluding(excludedIds: string[]): Promise<UserEntity[]> {
    if (excludedIds.length === 0) {
      return this.usersRepository.find();
    }

    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.id NOT IN (:...excludedIds)', { excludedIds })
      .getMany();
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOneBy({ id });
    if (user === null) {
      throw new NotFoundException(`Did not find the user with id ${id}`);
    }
    return user;
  }

  async delete(id: string): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id });

    await this.usersRepository.delete({ id });

    if (user) {
      await this.imageKitService.deleteImage(user.avatarFileId);
    }
  }

  async edit(
    id: string,
    userData: EditUserDto,
    image?: Express.Multer.File,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.findOneBy({ id: id });

    if (!user) {
      throw new NotFoundException('User with this id is not found');
    }

    const uploadedImage = image
      ? await this.imageKitService.uploadImage(image, '/users')
      : undefined;

    const result = await this.usersRepository.update(id, {
      username: userData.displayName,
      bio: userData.bio,
      email: userData.email,
      displayName: userData.displayName,
      avatarUrl: uploadedImage?.url,
      avatarFileId: uploadedImage?.fileId,
    });
    if (result.affected === 0) throw new NotFoundException();

    if (uploadedImage) {
      await this.imageKitService.deleteImage(user.avatarFileId);
    }

    return await this.findById(id);
  }

  async updateImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UserEntity> {
    const user = await this.findById(userId);

    const oldFileId = user.coverFileId;
    const uploadedImage = await this.imageKitService.uploadImage(
      file,
      '/users',
    );

    user.coverUrl = uploadedImage.url;
    user.coverFileId = uploadedImage.fileId;

    const saved = await this.usersRepository.save(user);
    await this.imageKitService.deleteImage(oldFileId);

    return saved;
  }
}
