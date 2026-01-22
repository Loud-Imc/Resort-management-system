import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesService } from './roles.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Post()
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Create new role' })
    create(@Body() createRoleDto: CreateRoleDto) {
        return this.rolesService.create(createRoleDto);
    }

    @Get('permissions')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Get all system permissions' })
    findAllPermissions() {
        return this.rolesService.findAllPermissions();
    }

    @Get()
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Get all roles' })
    findAll() {
        return this.rolesService.findAll();
    }

    @Get(':id')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Get role by ID' })
    findOne(@Param('id') id: string) {
        return this.rolesService.findOne(id);
    }

    @Patch(':id')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Update role' })
    update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
        return this.rolesService.update(id, updateRoleDto);
    }

    @Delete(':id')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Delete role' })
    remove(@Param('id') id: string) {
        return this.rolesService.remove(id);
    }

}
