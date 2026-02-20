import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PropertyCategoriesService } from './property-categories.service';
import { CreatePropertyCategoryDto } from './dto/create-property-category.dto';
import { UpdatePropertyCategoryDto } from './dto/update-property-category.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Property Categories')
@Controller('property-categories')
export class PropertyCategoriesController {
    constructor(private readonly categoriesService: PropertyCategoriesService) { }

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new property category (Admin only)' })
    create(@Body() createDto: CreatePropertyCategoryDto) {
        return this.categoriesService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'List all property categories' })
    findAll(@Query('all') includeInactive?: string) {
        return this.categoriesService.findAll(includeInactive === 'true');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get category by ID' })
    findOne(@Param('id') id: string) {
        return this.categoriesService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a category (Admin only)' })
    update(@Param('id') id: string, @Body() updateDto: UpdatePropertyCategoryDto) {
        return this.categoriesService.update(id, updateDto);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a category (Admin only)' })
    remove(@Param('id') id: string) {
        return this.categoriesService.remove(id);
    }
}
