import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto } from './dto/expense.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Create expense (Admin only)' })
    create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
        return this.expensesService.create(createExpenseDto, req.user.id);
    }

    @Get()
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Get all expenses with filters (Admin only)' })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    findAll(
        @Query('categoryId') categoryId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.expensesService.findAll({
            categoryId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
    }

    @Get('summary')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Get expense summary (Admin only)' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    getSummary(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.expensesService.getSummary(new Date(startDate), new Date(endDate));
    }

    @Get(':id')
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Get expense by ID (Admin only)' })
    findOne(@Param('id') id: string) {
        return this.expensesService.findOne(id);
    }

    @Patch(':id')
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Update expense (Admin only)' })
    update(
        @Param('id') id: string,
        @Body() updateExpenseDto: UpdateExpenseDto,
        @Request() req,
    ) {
        return this.expensesService.update(id, updateExpenseDto, req.user.id);
    }

    @Delete(':id')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Delete expense (Admin only)' })
    remove(@Param('id') id: string, @Request() req) {
        return this.expensesService.remove(id, req.user.id);
    }

    // ===== Categories =====

    @Post('categories')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Create expense category (Admin only)' })
    createCategory(@Body() createCategoryDto: CreateExpenseCategoryDto, @Request() req) {
        return this.expensesService.createCategory(createCategoryDto, req.user.id);
    }

    @Get('categories/all')
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Get all expense categories (Admin only)' })
    findAllCategories() {
        return this.expensesService.findAllCategories();
    }

    @Get('categories/:id')
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiOperation({ summary: 'Get expense category by ID (Admin only)' })
    findOneCategory(@Param('id') id: string) {
        return this.expensesService.findOneCategory(id);
    }

    @Delete('categories/:id')
    @Roles('SuperAdmin', 'Admin')
    @ApiOperation({ summary: 'Delete expense category (Admin only)' })
    removeCategory(@Param('id') id: string, @Request() req) {
        return this.expensesService.removeCategory(id, req.user.id);
    }
}
