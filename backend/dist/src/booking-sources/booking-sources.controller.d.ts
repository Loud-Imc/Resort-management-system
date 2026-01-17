import { BookingSourcesService } from './booking-sources.service';
import { CreateBookingSourceDto } from './dto/create-booking-source.dto';
import { UpdateBookingSourceDto } from './dto/update-booking-source.dto';
export declare class BookingSourcesController {
    private readonly bookingSourcesService;
    constructor(bookingSourcesService: BookingSourcesService);
    create(createDto: CreateBookingSourceDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        commission: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    findAll(): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        commission: import("@prisma/client/runtime/library").Decimal | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        commission: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    update(id: string, updateDto: UpdateBookingSourceDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        commission: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        commission: import("@prisma/client/runtime/library").Decimal | null;
    }>;
}
