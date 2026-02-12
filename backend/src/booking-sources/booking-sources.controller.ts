import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BookingSourcesService } from './booking-sources.service';
import { CreateBookingSourceDto } from './dto/create-booking-source.dto';
import { UpdateBookingSourceDto } from './dto/update-booking-source.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Booking Sources')
@Controller('booking-sources')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class BookingSourcesController {
    constructor(private readonly bookingSourcesService: BookingSourcesService) { }

    @Post()
    @Permissions(PERMISSIONS.BOOKING_SOURCES.CREATE)
    @ApiOperation({ summary: 'Create a booking source' })
    create(@Body() createDto: CreateBookingSourceDto) {
        return this.bookingSourcesService.create(createDto);
    }

    @Get()
    @Permissions(PERMISSIONS.BOOKING_SOURCES.READ)
    @ApiOperation({ summary: 'Get all booking sources' })
    findAll() {
        return this.bookingSourcesService.findAll();
    }

    @Get(':id')
    @Permissions(PERMISSIONS.BOOKING_SOURCES.READ)
    @ApiOperation({ summary: 'Get a booking source by ID' })
    findOne(@Param('id') id: string) {
        return this.bookingSourcesService.findOne(id);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.BOOKING_SOURCES.UPDATE)
    @ApiOperation({ summary: 'Update a booking source' })
    update(@Param('id') id: string, @Body() updateDto: UpdateBookingSourceDto) {
        return this.bookingSourcesService.update(id, updateDto);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.BOOKING_SOURCES.DELETE)
    @ApiOperation({ summary: 'Delete a booking source' })
    remove(@Param('id') id: string) {
        return this.bookingSourcesService.remove(id);
    }
}
