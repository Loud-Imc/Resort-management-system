import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingSourceDto } from './dto/create-booking-source.dto';
import { UpdateBookingSourceDto } from './dto/update-booking-source.dto';

@Injectable()
export class BookingSourcesService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateBookingSourceDto) {
        return this.prisma.bookingSource.create({
            data: {
                ...createDto,
                commission: createDto.commission ? Number(createDto.commission) : undefined,
            },
        });
    }

    async findAll() {
        return this.prisma.bookingSource.findMany({
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const source = await this.prisma.bookingSource.findUnique({
            where: { id },
        });

        if (!source) {
            throw new NotFoundException(`Booking source with ID ${id} not found`);
        }

        return source;
    }

    async update(id: string, updateDto: UpdateBookingSourceDto) {
        // Check if exists
        await this.findOne(id);

        return this.prisma.bookingSource.update({
            where: { id },
            data: {
                ...updateDto,
                commission: updateDto.commission !== undefined ? Number(updateDto.commission) : undefined,
            },
        });
    }

    async remove(id: string) {
        // Check if exists
        await this.findOne(id);

        return this.prisma.bookingSource.delete({
            where: { id },
        });
    }
}
