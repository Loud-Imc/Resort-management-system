import { Controller, Get, Post, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserWithRoleDto } from './dto/create-user-with-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Get all users' })
    findAll() {
        return this.usersService.findAll();
    }

    @Post()
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Create user with roles' })
    create(@Body() createUserDto: CreateUserWithRoleDto) {
        return this.usersService.createWithRoles(createUserDto);
    }


    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Update user' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Post(':userId/roles/:roleId')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Assign role to user' })
    assignRole(
        @Param('userId') userId: string,
        @Param('roleId') roleId: string,
    ) {
        return this.usersService.assignRole(userId, roleId);
    }
}
