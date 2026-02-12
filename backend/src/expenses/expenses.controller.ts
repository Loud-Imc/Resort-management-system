import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
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

    @Get()
    @Permissions(PERMISSIONS.EXPENSES.READ)
    @ApiOperation({ summary: 'Get all expenses with filters' })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    findAll(
        @Request() req,
        @Query('categoryId') categoryId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.expensesService.findAll(req.user, {
            categoryId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
    }

    @Get('summary')
    @Permissions(PERMISSIONS.EXPENSES.READ)
    @ApiOperation({ summary: 'Get expense summary' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    getSummary(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.expensesService.getSummary(req.user, new Date(startDate), new Date(endDate));
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
    remove(@Param('id') id: string, @Request() req) {
        return this.expensesService.remove(id, req.user);
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
    findAllCategories() {
        return this.expensesService.findAllCategories();
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
