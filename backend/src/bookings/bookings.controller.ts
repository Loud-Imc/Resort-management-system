import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SearchRoomsDto } from './dto/search-rooms.dto';

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
        );
    }

    @Post('public')
    @ApiOperation({ summary: 'Create public booking (No Auth)' })
    async createPublic(@Body() createBookingDto: CreateBookingDto) {
        // For public bookings, we might need to handle user creation/lookup internally
        // For now, pass a null or special system user ID if the service supports it,
        // OR update the service to handle "guest" booking creation where userId is optional/created on fly.
        // Assuming the service can handle user creation based on guest details in DTO.
        return this.bookingsService.create(createBookingDto, 'GUEST_USER'); // You might need to adjust logic to find/create user by email
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create booking' })
    create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
        return this.bookingsService.create(createBookingDto, req.user.id);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin', 'Manager', 'Staff')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all bookings with filters (Staff only)' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'roomTypeId', required: false })
    findAll(
        @Query('status') status?: string,
        @Query('roomTypeId') roomTypeId?: string,
    ) {
        return this.bookingsService.findAll({
            status,
            roomTypeId,
        });
    }

    @Get('today/check-ins')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin', 'Manager', 'Staff')
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get today's check-ins" })
    getTodayCheckIns() {
        return this.bookingsService.getTodayCheckIns();
    }

    @Get('today/check-outs')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin', 'Manager', 'Staff')
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get today's check-outs" })
    getTodayCheckOuts() {
        return this.bookingsService.getTodayCheckOuts();
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get booking by ID' })
    findOne(@Param('id') id: string) {
        return this.bookingsService.findOne(id);
    }

    @Post(':id/check-in')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin', 'Manager', 'Staff')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check-in booking (Staff only)' })
    checkIn(@Param('id') id: string, @Request() req) {
        return this.bookingsService.checkIn(id, req.user.id);
    }

    @Post(':id/check-out')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin', 'Manager', 'Staff')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check-out booking (Staff only)' })
    checkOut(@Param('id') id: string, @Request() req) {
        return this.bookingsService.checkOut(id, req.user.id);
    }

    @Post(':id/cancel')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cancel booking' })
    cancel(@Param('id') id: string, @Request() req, @Body('reason') reason?: string) {
        return this.bookingsService.cancel(id, req.user.id, reason);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update booking status (Admin only)' })
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Request() req,
    ) {
        return this.bookingsService.updateStatus(id, status, req.user.id);
    }
}
