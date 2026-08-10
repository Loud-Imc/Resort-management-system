import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto } from './dto/expense.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    @Permissions(PERMISSIONS.EXPENSES.CREATE)
    @ApiOperation({ summary: 'Create expense' })
    create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
        return this.expensesService.create(createExpenseDto, req.user.id);
    }

    @Post('bulk')
    @Permissions(PERMISSIONS.EXPENSES.CREATE)
    @ApiOperation({ summary: 'Create multiple expenses' })
    createBulk(@Body() createExpenseDtos: CreateExpenseDto[], @Request() req) {
        return this.expensesService.createBulk(createExpenseDtos, req.user.id);
    }

    @Get()
    @Permissions(PERMISSIONS.EXPENSES.READ)
    @ApiOperation({ summary: 'Get all expenses with filters' })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'propertyId', required: false })
    findAll(
        @Request() req,
        @Query('categoryId') categoryId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.expensesService.findAll(req.user, {
            categoryId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            propertyId,
        });
    }

    @Get('summary')
    @Permissions(PERMISSIONS.EXPENSES.READ)
    @ApiOperation({ summary: 'Get expense summary' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    @ApiQuery({ name: 'propertyId', required: false })
    getSummary(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('propertyId') propertyId?: string,
    ) {
        return this.expensesService.getSummary(
            req.user,
            new Date(startDate),
            new Date(endDate),
            propertyId
        );
    }

    @Get('report/pdf')
    @Permissions(PERMISSIONS.EXPENSES.READ)
    @ApiOperation({ summary: 'Download expenses report as PDF' })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'propertyId', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'paymentMethod', required: false })
    @ApiQuery({ name: 'isPaid', required: false })
    @ApiQuery({ name: 'minAmount', required: false })
    @ApiQuery({ name: 'maxAmount', required: false })
    async downloadPdfReport(
        @Request() req,
        @Query() filters: any,
        @Res() res
    ) {
        const buffer = await this.expensesService.generatePdfReport(req.user, filters);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Expenses_Report.pdf"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Get('alterations/logs')
    @Permissions(PERMISSIONS.EXPENSES.READ)
    @ApiOperation({ summary: 'Get all expense alteration histories' })
    @ApiQuery({ name: 'propertyId', required: false })
    findAllHistory(
        @Request() req,
        @Query('propertyId') propertyId?: string
    ) {
        return this.expensesService.findAllHistory(req.user, propertyId);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.EXPENSES.READ)
    @ApiOperation({ summary: 'Get expense by ID' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.expensesService.findOne(id, req.user);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.EXPENSES.UPDATE)
    @ApiOperation({ summary: 'Update expense' })
    update(
        @Param('id') id: string,
        @Body() updateExpenseDto: UpdateExpenseDto,
        @Request() req,
    ) {
        return this.expensesService.update(id, updateExpenseDto, req.user);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.EXPENSES.DELETE)
    @ApiOperation({ summary: 'Delete expense' })
    @ApiQuery({ name: 'reason', required: false })
    remove(
        @Param('id') id: string,
        @Query('reason') reason: string,
        @Request() req
    ) {
        return this.expensesService.remove(id, req.user, reason);
    }

    // ===== Categories =====

    @Post('categories')
    @Permissions(PERMISSIONS.EXPENSES.CREATE)
    @ApiOperation({ summary: 'Create expense category' })
    createCategory(@Body() createCategoryDto: CreateExpenseCategoryDto, @Request() req) {
        return this.expensesService.createCategory(createCategoryDto, req.user.id);
    }

    @Get('categories/all')
    @Permissions(PERMISSIONS.EXPENSES.READ)
    @ApiOperation({ summary: 'Get all expense categories' })
    @ApiQuery({ name: 'propertyId', required: false })
    findAllCategories(@Query('propertyId') propertyId?: string) {
        return this.expensesService.findAllCategories(propertyId);
    }

    @Get('categories/:id')
    @Permissions(PERMISSIONS.EXPENSES.READ)
    @ApiOperation({ summary: 'Get expense category by ID' })
    findOneCategory(@Param('id') id: string) {
        return this.expensesService.findOneCategory(id);
    }

    @Delete('categories/:id')
    @Permissions(PERMISSIONS.EXPENSES.DELETE)
    @ApiOperation({ summary: 'Delete expense category' })
    removeCategory(@Param('id') id: string, @Request() req) {
        return this.expensesService.removeCategory(id, req.user.id);
    }
}
