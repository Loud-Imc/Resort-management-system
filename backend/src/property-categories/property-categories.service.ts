import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyCategoryDto } from './dto/create-property-category.dto';
import { UpdatePropertyCategoryDto } from './dto/update-property-category.dto';

@Injectable()
export class PropertyCategoriesService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreatePropertyCategoryDto) {
        const existing = await this.prisma.propertyCategory.findFirst({
            where: {
                OR: [
                    { name: createDto.name },
                    { slug: createDto.slug },
                ],
            },
        });

        if (existing) {
            throw new ConflictException('Category with this name or slug already exists');
        }

        return this.prisma.propertyCategory.create({
            data: createDto,
        });
    }

    async findAll(includeInactive = false) {
        return this.prisma.propertyCategory.findMany({
            where: includeInactive ? {} : { isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const category = await this.prisma.propertyCategory.findUnique({
            where: { id },
        });

        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        return category;
    }

    async update(id: string, updateDto: UpdatePropertyCategoryDto) {
        await this.findOne(id);

        try {
            return await this.prisma.propertyCategory.update({
                where: { id },
                data: updateDto,
            });
        } catch (error) {
            throw new ConflictException('Name or slug already in use by another category');
        }
    }

    async remove(id: string) {
        const category = await this.findOne(id);

        // Check if any properties are using this category
        const propertyCount = await this.prisma.property.count({
            where: { categoryId: id },
        });

        if (propertyCount > 0) {
            throw new ConflictException('Cannot delete category that is assigned to properties. Deactivate it instead.');
        }

        return this.prisma.propertyCategory.delete({
            where: { id },
        });
    }
}
