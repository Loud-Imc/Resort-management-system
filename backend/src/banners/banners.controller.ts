import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BannerType } from '@prisma/client';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
    constructor(private readonly bannersService: BannersService) { }

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('Admin', 'SuperAdmin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new banner (Admin/SuperAdmin)' })
    create(@Body() createBannerDto: CreateBannerDto) {
        return this.bannersService.create(createBannerDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all banners (Admin/SuperAdmin)' })
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('Admin', 'SuperAdmin')
    @ApiBearerAuth()
    findAll(@Query('type') type?: BannerType) {
        return this.bannersService.findAll(type);
    }

    @Get('active')
    @ApiOperation({ summary: 'Get all active banners (Public)' })
    findActive(@Query('type') type?: BannerType) {
        return this.bannersService.findActive(type);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single banner' })
    findOne(@Param('id') id: string) {
        return this.bannersService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('Admin', 'SuperAdmin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a banner (Admin/SuperAdmin)' })
    update(@Param('id') id: string, @Body() updateBannerDto: UpdateBannerDto) {
        return this.bannersService.update(id, updateBannerDto);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('Admin', 'SuperAdmin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a banner (Admin/SuperAdmin)' })
    remove(@Param('id') id: string) {
        return this.bannersService.remove(id);
    }
}
