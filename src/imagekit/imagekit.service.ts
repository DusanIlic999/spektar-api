import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageKit } from '@imagekit/nodejs';

@Injectable()
export class ImageKitService {
  private readonly client: ImageKit;

  constructor(configService: ConfigService) {
    this.client = new ImageKit({
      privateKey: configService.get<string>('IMAGEKIT_PRIVATE_KEY') || 'unset',
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
    const uploadableFile = await ImageKit.toFile(file.buffer, file.originalname, {
      type: file.mimetype,
    });

    const response = await this.client.files.upload({
      file: uploadableFile,
      fileName: file.originalname,
      folder,
      useUniqueFileName: true,
    });

    return response.url!;
  }
}
