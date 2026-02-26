import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CancellationPoliciesService } from './cancellation-policies.service';
import { CreateCancellationPolicyDto, UpdateCancellationPolicyDto } from './dto/cancellation-policy.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('cancellation-policies')
@Controller('cancellation-policies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class CancellationPoliciesController {
    constructor(private readonly service: CancellationPoliciesService) { }

    @Post()
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiOperation({ summary: 'Create a new cancellation policy' })
    create(@Body() dto: CreateCancellationPolicyDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiQuery({ name: 'propertyId', required: true })
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiOperation({ summary: 'Get all cancellation policies for a property' })
    findAll(@Query('propertyId') propertyId: string) {
        return this.service.findAll(propertyId);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiOperation({ summary: 'Get a cancellation policy by ID' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiOperation({ summary: 'Update a cancellation policy' })
    update(@Param('id') id: string, @Body() dto: UpdateCancellationPolicyDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiOperation({ summary: 'Delete a cancellation policy' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
