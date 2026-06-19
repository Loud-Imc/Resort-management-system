import { Controller, Post, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import type { Express } from 'express';
import sharp from 'sharp';
import * as fs from 'fs';

async function compressImageIfNeeded(file: Express.Multer.File): Promise<void> {
    const COMPRESSIBLE_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!COMPRESSIBLE_MIMETYPES.includes(file.mimetype)) {
        return;
    }

    const filePath = file.path;
    if (!filePath || !fs.existsSync(filePath)) {
        return;
    }

    const tempPath = `${filePath}.tmp`;

    try {
        let pipeline = sharp(filePath).resize({
            width: 1920,
            height: 1920,
            fit: 'inside',
            withoutEnlargement: true,
        });

        // Apply quality compression based on format
        if (file.mimetype === 'image/png') {
            pipeline = pipeline.png({ quality: 85, compressionLevel: 8 });
        } else if (file.mimetype === 'image/webp') {
            pipeline = pipeline.webp({ quality: 85 });
        } else {
            pipeline = pipeline.jpeg({ quality: 85 });
        }

        await pipeline.toFile(tempPath);

        // Replace original file on disk with the compressed one
        fs.renameSync(tempPath, filePath);

        // Update the Multer file size metadata
        const stats = fs.statSync(filePath);
        file.size = stats.size;
    } catch (error) {
        console.error(`Image compression failed for file ${file.filename}, keeping original:`, error);
        if (fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (unlinkErr) {
                // Ignore
            }
        }
    }
}

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
    @Post()
    @ApiOperation({ summary: 'Upload a file' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        await compressImageIfNeeded(file);

        const baseUrl = process.env.API_URL || 'http://localhost:3000';
        return {
            url: `${baseUrl}/uploads/${file.filename}`,
            filename: file.filename
        };
    }

    @Post('bulk')
    @ApiOperation({ summary: 'Upload multiple files' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                },
            },
        },
    })
    @UseInterceptors(FilesInterceptor('files', 10)) // Limit to 10 files
    async uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
        if (!files || files.length === 0) {
            throw new BadRequestException('Files are required');
        }

        for (const file of files) {
            await compressImageIfNeeded(file);
        }

        const baseUrl = process.env.API_URL || 'http://localhost:3000';
        return files.map(file => ({
            url: `${baseUrl}/uploads/${file.filename}`,
            filename: file.filename
        }));
    }
}
