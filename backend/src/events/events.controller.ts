import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Events')
@Controller('events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Post()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.EVENTS.CREATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new event' })
    create(@Body() createEventDto: CreateEventDto, @Request() req) {
        return this.eventsService.create(createEventDto, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all active approved events (Public)' })
    findAll(
        @Query('propertyId') propertyId?: string,
        @Query('organizerType') organizerType?: string,
    ) {
        return this.eventsService.findAll({ status: 'APPROVED', propertyId, organizerType });
    }

    @Get('admin/all')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.EVENTS.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all events for admin management' })
    findAllAdmin(@Request() req, @Query('propertyId') propertyId?: string) {
        return this.eventsService.findAllAdmin(req.user.id, propertyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get event details by ID' })
    findOne(@Param('id') id: string) {
        return this.eventsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.EVENTS.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update an event' })
    update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto, @Request() req) {
        return this.eventsService.update(id, updateEventDto, req.user.id);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.EVENTS.DELETE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete (deactivate) an event' })
    remove(@Param('id') id: string, @Request() req) {
        return this.eventsService.remove(id, req.user.id);
    }

    @Patch(':id/approve')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.EVENTS.APPROVE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve a pending event (SuperAdmin only)' })
    approve(@Param('id') id: string, @Request() req) {
        return this.eventsService.approve(id, req.user.id);
    }
}
