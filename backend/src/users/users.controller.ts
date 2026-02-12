import { Controller, Get, Post, Body, Param, UseGuards, Patch, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserWithRoleDto } from './dto/create-user-with-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Permissions(PERMISSIONS.USERS.READ)
    @ApiOperation({ summary: 'Get all users' })
    findAll(@Request() req, @Query('propertyId') propertyId?: string) {
        return this.usersService.findAll(req.user, propertyId);
    }

    @Post()
    @Permissions(PERMISSIONS.USERS.CREATE)
    @ApiOperation({ summary: 'Create user with roles' })
    create(@Request() req, @Body() createUserDto: CreateUserWithRoleDto) {
        return this.usersService.createWithRoles(req.user, createUserDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.USERS.UPDATE)
    @ApiOperation({ summary: 'Update user' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Post(':userId/roles/:roleId')
    @Permissions(PERMISSIONS.USERS.MANAGE_ROLES)
    @ApiOperation({ summary: 'Assign role to user' })
    assignRole(
        @Param('userId') userId: string,
        @Param('roleId') roleId: string,
    ) {
        return this.usersService.assignRole(userId, roleId);
    }
}
