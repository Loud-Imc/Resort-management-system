import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto } from './dto/property.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
    constructor(private readonly propertiesService: PropertiesService) { }

    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================

    @Get()
    @ApiOperation({ summary: 'List all properties (public)' })
    findAll(@Query() query: PropertyQueryDto) {
        return this.propertiesService.findAll(query);
    }

    @Get(':slug')
    @ApiOperation({ summary: 'Get property by slug (public)' })
    findBySlug(@Param('slug') slug: string) {
        return this.propertiesService.findBySlug(slug);
    }

    // ============================================
    // AUTHENTICATED ENDPOINTS
    // ============================================

    @Post()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.CREATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new property' })
    create(@Request() req, @Body() data: CreatePropertyDto) {
        return this.propertiesService.create(req.user, data);
    }

    @Get('my/properties')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get properties owned by current user' })
    findOwned(@Request() req) {
        return this.propertiesService.findByOwner(req.user.id);
    }

    @Get('id/:id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get property by ID' })
    findById(@Param('id') id: string) {
        return this.propertiesService.findById(id);
    }

    @Put(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a property' })
    update(
        @Param('id') id: string,
        @Request() req,
        @Body() data: UpdatePropertyDto,
    ) {
        return this.propertiesService.update(id, req.user, data);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.DELETE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a property' })
    delete(@Param('id') id: string, @Request() req) {
        return this.propertiesService.delete(id, req.user.id);
    }

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    @Get('admin/all')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all properties including inactive (Admin)' })
    findAllAdmin(@Request() req, @Query() query: PropertyQueryDto) {
        return this.propertiesService.findAllAdmin(req.user, query);
    }

    @Put(':id/verify')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify a property (Admin)' })
    verify(@Param('id') id: string) {
        return this.propertiesService.verify(id);
    }

    @Put(':id/toggle-active')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Toggle property active status (Admin)' })
    toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.propertiesService.toggleActive(id, isActive);
    }
}
