import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageKit } from '@imagekit/nodejs';

export interface UploadedImage {
  url: string;
  fileId: string;
}

@Injectable()
export class ImageKitService {
  private readonly logger = new Logger(ImageKitService.name);
  private readonly client: ImageKit;

  constructor(configService: ConfigService) {
    this.client = new ImageKit({
      privateKey: configService.get<string>('IMAGEKIT_PRIVATE_KEY') || 'unset',
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadedImage> {
    const uploadableFile = await ImageKit.toFile(
      file.buffer,
      file.originalname,
      {
        type: file.mimetype,
      },
    );

    const response = await this.client.files.upload({
      file: uploadableFile,
      fileName: file.originalname,
      folder,
      useUniqueFileName: true,
    });

    return { url: response.url!, fileId: response.fileId! };
  }

  /**
   * Best-effort cleanup: failures are logged, not thrown, so a transient
   * ImageKit error never blocks the delete/replace operation that triggered it.
   */
  async deleteImage(fileId?: string | null): Promise<void> {
    if (!fileId) {
      return;
    }

    try {
      await this.client.files.delete(fileId);
    } catch (error) {
      this.logger.error(`Failed to delete ImageKit file ${fileId}`, error);
    }
  }
}
