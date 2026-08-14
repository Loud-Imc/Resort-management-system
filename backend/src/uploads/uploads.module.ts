import { Module, BadRequestException } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
    imports: [
        MulterModule.register({
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, cb) => {
                    const randomName = Array(32)
                        .fill(null)
                        .map(() => Math.round(Math.random() * 16).toString(16))
                        .join('');
                    return cb(null, `${randomName}${extname(file.originalname)}`);
                },
            }),
            limits: {
                fileSize: 15 * 1024 * 1024, // 15MB
            },
            fileFilter: (req, file, cb) => {
                const allowedMimetypes = [
                    'image/jpeg',
                    'image/png',
                    'image/webp',
                    'image/gif',
                    'image/avif',
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'text/plain',
                    'application/zip',
                    'application/x-zip-compressed',
                    'application/x-rar-compressed',
                ];
                if (allowedMimetypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
                }
            },
        }),
    ],
    controllers: [UploadsController],
})
export class UploadsModule { }
