import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OfflineCpsService } from './offline-cps.service';
import { CreateOfflineCpDto } from './dto/create-offline-cp.dto';
import { UpdateOfflineCpDto } from './dto/update-offline-cp.dto';

@Controller('offline-cps')
@UseGuards(AuthGuard('jwt'))
export class OfflineCpsController {
    constructor(private readonly offlineCpsService: OfflineCpsService) {}

    @Get()
    findAllForProperty(@Query('propertyId') propertyId: string) {
        return this.offlineCpsService.findAllForProperty(propertyId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.offlineCpsService.findOne(id);
    }

    @Post()
    create(@Body() createOfflineCpDto: CreateOfflineCpDto) {
        return this.offlineCpsService.create(createOfflineCpDto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateOfflineCpDto: UpdateOfflineCpDto) {
        return this.offlineCpsService.update(id, updateOfflineCpDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.offlineCpsService.remove(id);
    }
}
