import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto, BlockRoomDto } from './dto/room.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Rooms')
@Controller('rooms')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) { }

    @Post()
    @Permissions(PERMISSIONS.ROOMS.CREATE)
    @ApiOperation({ summary: 'Create a new room' })
    create(@Body() createRoomDto: CreateRoomDto, @Request() req) {
        return this.roomsService.create(createRoomDto, req.user.id);
    }

    @Post('bulk')
    @Permissions(PERMISSIONS.ROOMS.CREATE)
    @ApiOperation({ summary: 'Bulk create rooms' })
    bulkCreate(
        @Body('roomTypeId') roomTypeId: string,
        @Body('startNumber') startNumber: number,
        @Body('count') count: number,
        @Body('floor') floor: number,
        @Request() req,
    ) {
        return this.roomsService.bulkCreate(roomTypeId, startNumber, count, floor, req.user.id);
    }

    @Get()
    @Permissions(PERMISSIONS.ROOMS.READ)
    @ApiOperation({ summary: 'Get all rooms with filters' })
    @ApiQuery({ name: 'roomTypeId', required: false })
    @ApiQuery({ name: 'floor', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'isEnabled', required: false, type: Boolean })
    findAll(
        @Request() req,
        @Query('roomTypeId') roomTypeId?: string,
        @Query('floor') floor?: string,
        @Query('status') status?: string,
        @Query('isEnabled') isEnabled?: string,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.roomsService.findAll(req.user, {
            roomTypeId,
            floor: floor ? parseInt(floor) : undefined,
            status,
            isEnabled: isEnabled ? isEnabled === 'true' : undefined,
            propertyId,
        });
    }

    @Get(':id')
    @Permissions(PERMISSIONS.ROOMS.READ)
    @ApiOperation({ summary: 'Get room by ID' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.roomsService.findOne(id, req.user);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.ROOMS.UPDATE)
    @ApiOperation({ summary: 'Update room' })
    update(
        @Param('id') id: string,
        @Body() updateRoomDto: UpdateRoomDto,
        @Request() req,
    ) {
        return this.roomsService.update(id, updateRoomDto, req.user);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.ROOMS.DELETE)
    @ApiOperation({ summary: 'Delete room' })
    remove(@Param('id') id: string, @Request() req) {
        return this.roomsService.remove(id, req.user);
    }

    @Post(':id/block')
    @Permissions(PERMISSIONS.ROOMS.BLOCK)
    @ApiOperation({ summary: 'Block room for maintenance/owner use' })
    blockRoom(
        @Param('id') id: string,
        @Body() blockRoomDto: BlockRoomDto,
        @Request() req,
    ) {
        return this.roomsService.blockRoom(id, blockRoomDto, req.user);
    }

    @Get(':id/blocks')
    @Permissions(PERMISSIONS.ROOMS.READ)
    @ApiOperation({ summary: 'Get room blocks' })
    getRoomBlocks(@Param('id') id: string, @Request() req) {
        return this.roomsService.getRoomBlocks(id, req.user);
    }

    @Delete('blocks/:blockId')
    @Permissions(PERMISSIONS.ROOMS.BLOCK)
    @ApiOperation({ summary: 'Remove room block' })
    removeBlock(@Param('blockId') blockId: string, @Request() req) {
        return this.roomsService.removeBlock(blockId, req.user);
    }
}
