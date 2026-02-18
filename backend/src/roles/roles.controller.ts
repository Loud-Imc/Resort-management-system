import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Post()
    @Permissions(PERMISSIONS.ROLES.CREATE)
    @ApiOperation({ summary: 'Create new role' })
    create(@Body() createRoleDto: CreateRoleDto, @Req() req) {
        return this.rolesService.create(createRoleDto, req.user);
    }

    @Get('permissions')
    @Permissions(PERMISSIONS.ROLES.READ)
    @ApiOperation({ summary: 'Get all system permissions' })
    findAllPermissions() {
        return this.rolesService.findAllPermissions();
    }

    @Get()
    @Permissions(PERMISSIONS.ROLES.READ)
    @ApiOperation({ summary: 'Get all roles' })
    findAll(@Req() req) {
        return this.rolesService.findAll(req.user);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.ROLES.READ)
    @ApiOperation({ summary: 'Get role by ID' })
    findOne(@Param('id') id: string) {
        return this.rolesService.findOne(id);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.ROLES.UPDATE)
    @ApiOperation({ summary: 'Update role' })
    update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto, @Req() req) {
        return this.rolesService.update(id, updateRoleDto, req.user);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.ROLES.DELETE)
    @ApiOperation({ summary: 'Delete role' })
    remove(@Param('id') id: string) {
        return this.rolesService.remove(id);
    }

}
