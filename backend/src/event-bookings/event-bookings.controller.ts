import { Controller, Post, Get, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventBookingsService } from './event-bookings.service';
import { CreateEventBookingDto } from './dto/create-event-booking.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('event-bookings')
export class EventBookingsController {
    constructor(private readonly eventBookingsService: EventBookingsService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    create(@Body() createEventBookingDto: CreateEventBookingDto, @Request() req) {
        return this.eventBookingsService.create(createEventBookingDto, req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('my/bookings')
    findAll(@Request() req) {
        return this.eventBookingsService.findAll(req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.eventBookingsService.findOne(id, req.user.id);
    }

    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('events.verify')
    @Patch('verify/:ticketId')
    verify(@Param('ticketId') ticketId: string, @Request() req) {
        return this.eventBookingsService.verifyTicket(ticketId, req.user.id);
    }

    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('events.view_bookings')
    @Get('admin/all')
    findAllAdmin() {
        return this.eventBookingsService.findAllAdmin();
    }
}
