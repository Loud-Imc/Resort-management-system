import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { SearchRoomsDto } from './dto/search-rooms.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

import { CheckInDto } from './dto/check-in.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
    constructor(
        private readonly bookingsService: BookingsService,
        private readonly availabilityService: AvailabilityService,
        private readonly pricingService: PricingService,
    ) { }

    @Post('check-availability')
    @ApiOperation({ summary: 'Check room availability (Public)' })
    async checkAvailability(@Body() dto: CheckAvailabilityDto) {
        const isAvailable = await this.availabilityService.checkAvailability(
            dto.roomTypeId,
            new Date(dto.checkInDate),
            new Date(dto.checkOutDate),
        );

        const availableCount = await this.availabilityService.getAvailableRoomCount(
            dto.roomTypeId,
            new Date(dto.checkInDate),
            new Date(dto.checkOutDate),
        );

        return {
            available: isAvailable,
            availableRooms: availableCount,
        };
    }

    @Post('search')
    @ApiOperation({ summary: 'Search available room types (Public)' })
    async searchRooms(@Body() dto: SearchRoomsDto) {
        const results = await this.availabilityService.searchAvailableRoomTypes(
            new Date(dto.checkInDate),
            new Date(dto.checkOutDate),
            dto.adults,
            dto.children || 0,
            dto.location,
            dto.type,
            dto.includeSoldOut || false,
            dto.rooms || 1,
            dto.categoryId,
            dto.latitude,
            dto.longitude,
            dto.radius,
            dto.currency,
        );

        return {
            availableRoomTypes: results
        };
    }

    @Post('calculate-price')
    @ApiOperation({ summary: 'Calculate booking price (Public)' })
    async calculatePrice(@Body() dto: CalculatePriceDto) {
        return this.pricingService.calculatePrice(
            dto.roomTypeId,
            new Date(dto.checkInDate),
            new Date(dto.checkOutDate),
            dto.adultsCount,
            dto.childrenCount,
            dto.couponCode,
            dto.referralCode,
            dto.currency,
        );
    }

    @Post('public')
    @ApiOperation({ summary: 'Create public booking (No Auth)' })
    async createPublic(@Body() createBookingDto: CreateBookingDto) {
        return this.bookingsService.create(createBookingDto, 'GUEST_USER');
    }

    @Post()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create booking' })
    create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
        return this.bookingsService.create(createBookingDto, req.user.id);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.BOOKINGS.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all bookings with filters' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'roomTypeId', required: false })
    @ApiQuery({ name: 'propertyId', required: false })
    findAll(
        @Request() req,
        @Query('status') status?: string,
        @Query('roomTypeId') roomTypeId?: string,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.bookingsService.findAll(req.user, {
            status,
            roomTypeId,
            propertyId,
        });
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my own bookings' })
    findMyBookings(@Request() req) {
        return this.bookingsService.findMyBookings(req.user.id);
    }

    @Get('today/check-ins')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.BOOKINGS.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get today's check-ins" })
    getTodayCheckIns(@Request() req) {
        return this.bookingsService.getTodayCheckIns(req.user);
    }

    @Get('today/check-outs')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.BOOKINGS.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get today's check-outs" })
    getTodayCheckOuts(@Request() req) {
        return this.bookingsService.getTodayCheckOuts(req.user);
    }

    @Get('public/:id')
    @ApiOperation({ summary: 'Get booking by ID (Public)' })
    findOnePublic(@Param('id') id: string) {
        return this.bookingsService.findOnePublic(id);
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get booking by ID' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.bookingsService.findOne(id, req.user);
    }

    @Post(':id/check-in')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.BOOKINGS.CHECK_IN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check-in booking' })
    checkIn(
        @Param('id') id: string,
        @Body() dto: CheckInDto,
        @Request() req
    ) {
        return this.bookingsService.checkIn(id, req.user, dto);
    }

    @Post(':id/check-out')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.BOOKINGS.CHECK_OUT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check-out booking' })
    checkOut(@Param('id') id: string, @Request() req) {
        return this.bookingsService.checkOut(id, req.user);
    }

    @Post(':id/cancel')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cancel booking' })
    cancel(@Param('id') id: string, @Request() req, @Body('reason') reason?: string) {
        return this.bookingsService.cancel(id, req.user, reason);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.BOOKINGS.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update booking status' })
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Request() req,
    ) {
        return this.bookingsService.updateStatus(id, status, req.user);
    }
}
