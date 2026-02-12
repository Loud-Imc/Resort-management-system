import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IncomeService } from './income.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Income')
@Controller('income')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class IncomeController {
    constructor(private readonly incomeService: IncomeService) { }

    @Post()
    @Permissions(PERMISSIONS.INCOME.CREATE)
    @ApiOperation({ summary: 'Create income record' })
    create(@Body() createIncomeDto: CreateIncomeDto, @Request() req) {
        return this.incomeService.create(createIncomeDto, req.user.id);
    }

    @Get()
    @Permissions(PERMISSIONS.INCOME.READ)
    @ApiOperation({ summary: 'Get all income records with filters' })
    @ApiQuery({ name: 'source', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'bookingId', required: false })
    findAll(
        @Query('source') source?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('bookingId') bookingId?: string,
    ) {
        return this.incomeService.findAll({
            source,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            bookingId,
        });
    }

    @Get('summary')
    @Permissions(PERMISSIONS.INCOME.READ)
    @ApiOperation({ summary: 'Get income summary' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    getSummary(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.incomeService.getSummary(new Date(startDate), new Date(endDate));
    }

    @Get(':id')
    @Permissions(PERMISSIONS.INCOME.READ)
    @ApiOperation({ summary: 'Get income record by ID' })
    findOne(@Param('id') id: string) {
        return this.incomeService.findOne(id);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.INCOME.UPDATE)
    @ApiOperation({ summary: 'Update income record' })
    update(
        @Param('id') id: string,
        @Body() updateIncomeDto: UpdateIncomeDto,
        @Request() req,
    ) {
        return this.incomeService.update(id, updateIncomeDto, req.user.id);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.INCOME.DELETE)
    @ApiOperation({ summary: 'Delete income record' })
    remove(@Param('id') id: string, @Request() req) {
        return this.incomeService.remove(id, req.user.id);
    }
}
