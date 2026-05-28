import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResult } from '../../common/api-result';

const uploadDir = join(__dirname, '..', '..', '..', 'uploads');

@Controller('files')
export class FileController {
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + extname(file.originalname));
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const url = `/uploads/${file.filename}`;
    return ApiResult.success({ url, filename: file.originalname }, '上传成功');
  }
}

@Module({
  imports: [MulterModule.register({ dest: uploadDir })],
  controllers: [FileController],
})
export class FileModule {}
