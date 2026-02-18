import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('dashboard')
    @Permissions(PERMISSIONS.REPORTS.VIEW_DASHBOARD)
    @ApiOperation({ summary: "Get dashboard statistics (Today's overview)" })
    getDashboardStats(@Request() req) {
        return this.reportsService.getDashboardStats(req.user);
    }

    @Get('financial')
    @Permissions(PERMISSIONS.REPORTS.VIEW_FINANCIAL)
    @ApiOperation({ summary: 'Get financial report' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    @ApiQuery({ name: 'propertyId', required: false })
    getFinancialReport(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.reportsService.getFinancialReport(
            req.user,
            new Date(startDate),
            new Date(endDate),
            propertyId,
        );
    }

    @Get('occupancy')
    @Permissions(PERMISSIONS.REPORTS.VIEW_OCCUPANCY)
    @ApiOperation({ summary: 'Get occupancy report' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    @ApiQuery({ name: 'propertyId', required: false })
    getOccupancyReport(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.reportsService.getOccupancyReport(
            req.user,
            new Date(startDate),
            new Date(endDate),
            propertyId,
        );
    }

    @Get('room-performance')
    @Permissions(PERMISSIONS.REPORTS.VIEW_FINANCIAL)
    @ApiOperation({ summary: 'Get room performance report' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    @ApiQuery({ name: 'propertyId', required: false })
    getRoomPerformanceReport(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.reportsService.getRoomPerformanceReport(
            req.user,
            new Date(startDate),
            new Date(endDate),
            propertyId,
        );
    }

    @Get('partners')
    @Permissions(PERMISSIONS.REPORTS.VIEW_FINANCIAL)
    @ApiOperation({ summary: 'Get channel partner performance report' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    getPartnerReport(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.getPartnerReport(
            req.user,
            new Date(startDate),
            new Date(endDate),
        );
    }
}
