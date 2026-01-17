import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
}
