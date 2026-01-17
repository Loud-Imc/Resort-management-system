import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IncomeService } from './income.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Income')
@Controller('income')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class IncomeController {
    constructor(private readonly incomeService: IncomeService) { }

    @Post()
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Create income record (Admin only)' })
    create(@Body() createIncomeDto: CreateIncomeDto, @Request() req) {
        return this.incomeService.create(createIncomeDto, req.user.id);
    }

    @Get()
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Get all income records with filters (Admin only)' })
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
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Get income summary (Admin only)' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    getSummary(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.incomeService.getSummary(new Date(startDate), new Date(endDate));
    }

    @Get(':id')
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Get income record by ID (Admin only)' })
    findOne(@Param('id') id: string) {
        return this.incomeService.findOne(id);
    }

    @Patch(':id')
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Update income record (Admin only)' })
    update(
        @Param('id') id: string,
        @Body() updateIncomeDto: UpdateIncomeDto,
        @Request() req,
    ) {
        return this.incomeService.update(id, updateIncomeDto, req.user.id);
    }

    @Delete(':id')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Delete income record (Admin only)' })
    remove(@Param('id') id: string, @Request() req) {
        return this.incomeService.remove(id, req.user.id);
    }
}
