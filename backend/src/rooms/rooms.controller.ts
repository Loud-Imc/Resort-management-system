import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto, BlockRoomDto } from './dto/room.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Rooms')
@Controller('rooms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) { }

    @Post()
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Create a new room (Admin only)' })
    create(@Body() createRoomDto: CreateRoomDto, @Request() req) {
        return this.roomsService.create(createRoomDto, req.user.id);
    }

    @Post('bulk')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Bulk create rooms (Admin only)' })
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
    @Roles('SuperAdmin', 'Admin', 'Manager', 'Staff')
    @ApiOperation({ summary: 'Get all rooms with filters (Staff only)' })
    @ApiQuery({ name: 'roomTypeId', required: false })
    @ApiQuery({ name: 'floor', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'isEnabled', required: false, type: Boolean })
    findAll(
        @Query('roomTypeId') roomTypeId?: string,
        @Query('floor') floor?: string,
        @Query('status') status?: string,
        @Query('isEnabled') isEnabled?: string,
    ) {
        return this.roomsService.findAll({
            roomTypeId,
            floor: floor ? parseInt(floor) : undefined,
            status,
            isEnabled: isEnabled ? isEnabled === 'true' : undefined,
        });
    }

    @Get(':id')
    @Roles('SuperAdmin', 'Admin', 'Manager', 'Staff')
    @ApiOperation({ summary: 'Get room by ID (Staff only)' })
    findOne(@Param('id') id: string) {
        return this.roomsService.findOne(id);
    }

    @Patch(':id')
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Update room (Admin only)' })
    update(
        @Param('id') id: string,
        @Body() updateRoomDto: UpdateRoomDto,
        @Request() req,
    ) {
        return this.roomsService.update(id, updateRoomDto, req.user.id);
    }

    @Delete(':id')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Delete room (Admin only)' })
    remove(@Param('id') id: string, @Request() req) {
        return this.roomsService.remove(id, req.user.id);
    }

    @Post(':id/block')
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Block room for maintenance/owner use (Admin only)' })
    blockRoom(
        @Param('id') id: string,
        @Body() blockRoomDto: BlockRoomDto,
        @Request() req,
    ) {
        return this.roomsService.blockRoom(id, blockRoomDto, req.user.id);
    }

    @Get(':id/blocks')
    @Roles('SuperAdmin', 'Admin', 'Manager', 'Staff')
    @ApiOperation({ summary: 'Get room blocks (Staff only)' })
    getRoomBlocks(@Param('id') id: string) {
        return this.roomsService.getRoomBlocks(id);
    }

    @Delete('blocks/:blockId')
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Remove room block (Admin only)' })
    removeBlock(@Param('blockId') blockId: string, @Request() req) {
        return this.roomsService.removeBlock(blockId, req.user.id);
    }
}
