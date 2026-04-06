import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerType } from '@prisma/client';

@Injectable()
export class BannersService {
    constructor(private prisma: PrismaService) { }

    async create(createBannerDto: CreateBannerDto) {
        return this.prisma.banner.create({
            data: createBannerDto,
        });
    }

    async findAll(type?: BannerType) {
        return this.prisma.banner.findMany({
            where: type ? { type } : {},
            orderBy: { position: 'asc' },
        });
    }

    async findActive(type?: BannerType) {
        return this.prisma.banner.findMany({
            where: {
                isActive: true,
                ...(type ? { type } : {}),
            },
            orderBy: { position: 'asc' },
        });
    }

    async findOne(id: string) {
        const banner = await this.prisma.banner.findUnique({
            where: { id },
        });

        if (!banner) {
            throw new NotFoundException(`Banner with ID ${id} not found`);
        }

        return banner;
    }

    async update(id: string, updateBannerDto: UpdateBannerDto) {
        try {
            return await this.prisma.banner.update({
                where: { id },
                data: updateBannerDto,
            });
        } catch (error) {
            throw new NotFoundException(`Banner with ID ${id} not found`);
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.banner.delete({
                where: { id },
            });
        } catch (error) {
            throw new NotFoundException(`Banner with ID ${id} not found`);
        }
    }
}
