import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PropertyStaffService } from './property-staff.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Property Staff')
@Controller('properties/:id/staff')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PropertyStaffController {
    constructor(private readonly propertyStaffService: PropertyStaffService) { }

    @Post()
    @Permissions(PERMISSIONS.PROPERTY_STAFF.MANAGE)
    @ApiOperation({ summary: 'Add staff member to property' })
    addStaff(
        @Param('id') propertyId: string,
        @Body() data: { userId: string; role: string },
        @Request() req
    ) {
        return this.propertyStaffService.addStaff(propertyId, data.userId, data.role, req.user.id);
    }

    @Get()
    @Permissions(PERMISSIONS.PROPERTIES.READ) // Or specific permission if needed
    @ApiOperation({ summary: 'Get all staff for a property' })
    getStaff(@Param('id') propertyId: string) {
        return this.propertyStaffService.getPropertyStaff(propertyId);
    }

    @Delete(':userId')
    @Permissions(PERMISSIONS.PROPERTY_STAFF.MANAGE)
    @ApiOperation({ summary: 'Remove staff member from property' })
    removeStaff(
        @Param('id') propertyId: string,
        @Param('userId') userId: string,
        @Request() req
    ) {
        return this.propertyStaffService.removeStaff(propertyId, userId, req.user.id);
    }
}
