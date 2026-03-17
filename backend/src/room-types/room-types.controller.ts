import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Room Types')
@Controller('room-types')
export class RoomTypesController {
    constructor(private readonly roomTypesService: RoomTypesService) { }

    @Post()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.ROOM_TYPES.CREATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create room type' })
    create(@Body() createRoomTypeDto: CreateRoomTypeDto, @Req() req: any) {
        return this.roomTypesService.create(createRoomTypeDto, req?.user);
    }

    @Get()
    @ApiOperation({ summary: 'Get all room types' })
    findAll(
        @Query('publicOnly') publicOnly?: string,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.roomTypesService.findAll(publicOnly === 'true', propertyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get room type by ID' })
    findOne(@Param('id') id: string, @Req() req: any) {
        return this.roomTypesService.findOne(id, req?.user);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.ROOM_TYPES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update room type' })
    update(@Param('id') id: string, @Body() updateRoomTypeDto: UpdateRoomTypeDto, @Req() req: any) {
        return this.roomTypesService.update(id, updateRoomTypeDto, req?.user);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.ROOM_TYPES.DELETE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete room type' })
    remove(@Param('id') id: string, @Req() req: any) {
        return this.roomTypesService.remove(id, req?.user);
    }

    @Get('admin/all')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.ROOM_TYPES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all room types (Admin)' })
    findAllAdmin(@Req() req, @Query('propertyId') propertyId?: string) {
        return this.roomTypesService.findAllAdmin(req.user, propertyId);
    }
}
