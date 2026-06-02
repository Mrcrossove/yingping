import { BadRequestException, Controller, Module, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import COS from 'cos-nodejs-sdk-v5';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResult } from '../../common/api-result';

const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), '..', 'uploads');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function buildFileName(originalName: string) {
  const ext = extname(originalName).toLowerCase() || '.jpg';
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${unique}${ext}`;
}

function normalizeDomain(domain?: string) {
  if (!domain) return '';
  return domain.endsWith('/') ? domain.slice(0, -1) : domain;
}

@Controller('files')
export class FileController {
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        cb(new BadRequestException('仅支持 jpg、png、webp、gif 图片'), false);
        return;
      }
      cb(null, true);
    },
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的图片');

    const filename = buildFileName(file.originalname);
    const keyPrefix = (process.env.COS_KEY_PREFIX || 'beverage-order').replace(/^\/+|\/+$/g, '');
    const key = `${keyPrefix}/${filename}`;

    if (this.isCosEnabled()) {
      const url = await this.uploadToCos(file, key);
      return ApiResult.success({ url, key, filename: file.originalname, storage: 'cos' }, '上传成功');
    }

    writeFileSync(join(uploadDir, filename), file.buffer);
    const url = `/uploads/${filename}`;
    return ApiResult.success({ url, filename: file.originalname, storage: 'local' }, '上传成功');
  }

  private isCosEnabled() {
    return Boolean(
      process.env.COS_SECRET_ID &&
      process.env.COS_SECRET_KEY &&
      process.env.COS_BUCKET &&
      process.env.COS_REGION,
    );
  }

  private async uploadToCos(file: Express.Multer.File, key: string) {
    const cos = new COS({
      SecretId: process.env.COS_SECRET_ID!,
      SecretKey: process.env.COS_SECRET_KEY!,
    });

    await new Promise<void>((resolve, reject) => {
      cos.putObject({
        Bucket: process.env.COS_BUCKET!,
        Region: process.env.COS_REGION!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const cdnDomain = normalizeDomain(process.env.COS_CDN_DOMAIN);
    if (cdnDomain) return `${cdnDomain}/${key}`;

    const bucket = process.env.COS_BUCKET!;
    const region = process.env.COS_REGION!;
    return `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
  }
}

@Module({
  imports: [MulterModule.register({ storage: memoryStorage() })],
  controllers: [FileController],
})
export class FileModule {}
