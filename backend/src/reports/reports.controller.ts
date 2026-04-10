import { Controller, Get, Query, UseGuards, Request, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
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
    @ApiQuery({ name: 'propertyId', required: false })
    getDashboardStats(
        @Request() req,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.reportsService.getDashboardStats(req.user, propertyId);
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

    @Get('financial/details')
    @Permissions(PERMISSIONS.REPORTS.VIEW_FINANCIAL)
    @ApiOperation({ summary: 'Get financial report details (Incomes and Bookings list)' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    @ApiQuery({ name: 'propertyId', required: false })
    getFinancialDetails(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.reportsService.getFinancialDetails(
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

    @Get('abandoned')
    @Permissions(PERMISSIONS.REPORTS.VIEW_FINANCIAL)
    @ApiOperation({ summary: 'Get abandoned bookings (Pending Payment)' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    @ApiQuery({ name: 'propertyId', required: false })
    getAbandonedBookings(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.reportsService.getAbandonedBookings(
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

    @Get('export/excel')
    @Permissions(PERMISSIONS.REPORTS.VIEW_FINANCIAL)
    @ApiOperation({ summary: 'Export reports to Excel' })
    async exportExcel(
        @Request() req,
        @Res({ passthrough: true }) res: Response,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('propertyId') propertyId?: string,
    ) {
        const buffer = await this.reportsService.generateExcelReport(
            req.user,
            new Date(startDate),
            new Date(endDate),
            propertyId,
        );

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=Report_${startDate}_${endDate}.xlsx`,
        });

        return new StreamableFile(buffer);
    }

    @Get('export/pdf')
    @Permissions(PERMISSIONS.REPORTS.VIEW_FINANCIAL)
    @ApiOperation({ summary: 'Export reports to PDF' })
    async exportPdf(
        @Request() req,
        @Res({ passthrough: true }) res: Response,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('propertyId') propertyId?: string,
    ) {
        const buffer = await this.reportsService.generatePdfReport(
            req.user,
            new Date(startDate),
            new Date(endDate),
            propertyId,
        );

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Report_${startDate}_${endDate}.pdf`,
        });

        return new StreamableFile(buffer);
    }
}
