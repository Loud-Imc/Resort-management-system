import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('dashboard')
    @Roles('SuperAdmin', 'Admin', 'Manager', 'Staff')
    @ApiOperation({ summary: "Get dashboard statistics (Today's overview)" })
    getDashboardStats() {
        return this.reportsService.getDashboardStats();
    }

    @Get('financial')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Get financial report (Admin only)' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    getFinancialReport(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.getFinancialReport(
            new Date(startDate),
            new Date(endDate),
        );
    }

    @Get('occupancy')
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Get occupancy report' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    getOccupancyReport(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.getOccupancyReport(
            new Date(startDate),
            new Date(endDate),
        );
    }
}
