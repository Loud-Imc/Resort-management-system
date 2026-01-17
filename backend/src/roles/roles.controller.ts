import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesService } from './roles.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Get all roles' })
    findAll() {
        return this.rolesService.findAll();
    }
}
