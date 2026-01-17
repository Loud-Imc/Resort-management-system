import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Room Types')
@Controller('room-types')
export class RoomTypesController {
    constructor(private readonly roomTypesService: RoomTypesService) { }

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create room type' })
    create(@Body() createRoomTypeDto: CreateRoomTypeDto) {
        return this.roomTypesService.create(createRoomTypeDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all room types' })
    findAll(@Query('publicOnly') publicOnly?: string) {
        return this.roomTypesService.findAll(publicOnly === 'true');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get room type by ID' })
    findOne(@Param('id') id: string) {
        return this.roomTypesService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update room type' })
    update(@Param('id') id: string, @Body() updateRoomTypeDto: UpdateRoomTypeDto) {
        return this.roomTypesService.update(id, updateRoomTypeDto);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete room type' })
    remove(@Param('id') id: string) {
        return this.roomTypesService.remove(id);
    }
}
