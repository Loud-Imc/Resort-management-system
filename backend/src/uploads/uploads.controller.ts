import { Controller, Post, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import type { Express } from 'express';

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
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        // Return the path to access the file
        // Assuming we serve static files from /uploads
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
    uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
        if (!files || files.length === 0) {
            throw new BadRequestException('Files are required');
        }
        const baseUrl = process.env.API_URL || 'http://localhost:3000';
        return files.map(file => ({
            url: `${baseUrl}/uploads/${file.filename}`,
            filename: file.filename
        }));
    }
}
