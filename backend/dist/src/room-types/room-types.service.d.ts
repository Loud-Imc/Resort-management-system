import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
export declare class RoomTypesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createRoomTypeDto: CreateRoomTypeDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        amenities: string[];
        basePrice: import("@prisma/client/runtime/library").Decimal;
        extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
        extraChildPrice: import("@prisma/client/runtime/library").Decimal;
        freeChildrenCount: number;
        maxAdults: number;
        maxChildren: number;
        isPubliclyVisible: boolean;
        images: string[];
        propertyId: string | null;
    }>;
    findAll(publicOnly?: boolean): Promise<({
        property: {
            name: string;
            city: string;
        } | null;
        rooms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            propertyId: string | null;
            roomNumber: string;
            floor: number | null;
            status: import(".prisma/client").$Enums.RoomStatus;
            isEnabled: boolean;
            notes: string | null;
            roomTypeId: string;
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        amenities: string[];
        basePrice: import("@prisma/client/runtime/library").Decimal;
        extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
        extraChildPrice: import("@prisma/client/runtime/library").Decimal;
        freeChildrenCount: number;
        maxAdults: number;
        maxChildren: number;
        isPubliclyVisible: boolean;
        images: string[];
        propertyId: string | null;
    })[]>;
    findAllAdmin(user: any): Promise<({
        _count: {
            rooms: number;
        };
        property: {
            name: string;
            city: string;
        } | null;
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        amenities: string[];
        basePrice: import("@prisma/client/runtime/library").Decimal;
        extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
        extraChildPrice: import("@prisma/client/runtime/library").Decimal;
        freeChildrenCount: number;
        maxAdults: number;
        maxChildren: number;
        isPubliclyVisible: boolean;
        images: string[];
        propertyId: string | null;
    })[]>;
    findOne(id: string): Promise<{
        rooms: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            propertyId: string | null;
            roomNumber: string;
            floor: number | null;
            status: import(".prisma/client").$Enums.RoomStatus;
            isEnabled: boolean;
            notes: string | null;
            roomTypeId: string;
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        amenities: string[];
        basePrice: import("@prisma/client/runtime/library").Decimal;
        extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
        extraChildPrice: import("@prisma/client/runtime/library").Decimal;
        freeChildrenCount: number;
        maxAdults: number;
        maxChildren: number;
        isPubliclyVisible: boolean;
        images: string[];
        propertyId: string | null;
    }>;
    update(id: string, updateRoomTypeDto: UpdateRoomTypeDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        amenities: string[];
        basePrice: import("@prisma/client/runtime/library").Decimal;
        extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
        extraChildPrice: import("@prisma/client/runtime/library").Decimal;
        freeChildrenCount: number;
        maxAdults: number;
        maxChildren: number;
        isPubliclyVisible: boolean;
        images: string[];
        propertyId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        amenities: string[];
        basePrice: import("@prisma/client/runtime/library").Decimal;
        extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
        extraChildPrice: import("@prisma/client/runtime/library").Decimal;
        freeChildrenCount: number;
        maxAdults: number;
        maxChildren: number;
        isPubliclyVisible: boolean;
        images: string[];
        propertyId: string | null;
    }>;
}
