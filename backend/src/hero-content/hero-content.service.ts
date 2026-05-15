import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHeroContentDto } from './dto/create-hero-content.dto';
import { UpdateHeroContentDto } from './dto/update-hero-content.dto';

@Injectable()
export class HeroContentService {
    constructor(private prisma: PrismaService) { }

    async create(createHeroContentDto: CreateHeroContentDto) {
        return this.prisma.heroContent.create({
            data: createHeroContentDto,
        });
    }

    async findAll() {
        return this.prisma.heroContent.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findActive() {
        return this.prisma.heroContent.findMany({
            where: { isActive: true },
        });
    }

    async findRandom() {
        const activeContent = await this.findActive();
        if (activeContent.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * activeContent.length);
        return activeContent[randomIndex];
    }

    async findOne(id: string) {
        const content = await this.prisma.heroContent.findUnique({
            where: { id },
        });

        if (!content) {
            throw new NotFoundException(`Hero content with ID ${id} not found`);
        }

        return content;
    }

    async update(id: string, updateHeroContentDto: UpdateHeroContentDto) {
        try {
            return await this.prisma.heroContent.update({
                where: { id },
                data: updateHeroContentDto,
            });
        } catch (error) {
            throw new NotFoundException(`Hero content with ID ${id} not found`);
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.heroContent.delete({
                where: { id },
            });
        } catch (error) {
            throw new NotFoundException(`Hero content with ID ${id} not found`);
        }
    }
}
