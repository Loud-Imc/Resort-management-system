import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto, BlockRoomDto } from './dto/room.dto';
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
    create(createRoomDto: CreateRoomDto, req: any): Promise<{
        roomType: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            amenities: string[];
            basePrice: import("@prisma/client/runtime/library").Decimal;
            extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
            extraChildPrice: import("@prisma/client/runtime/library").Decimal;
            freeChildrenCount: number;
            maxAdults: number;
            maxChildren: number;
            isPubliclyVisible: boolean;
            images: string[];
        };
    } & {
        id: string;
        roomNumber: string;
        floor: number | null;
        status: import(".prisma/client").$Enums.RoomStatus;
        isEnabled: boolean;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        roomTypeId: string;
    }>;
    bulkCreate(roomTypeId: string, startNumber: number, count: number, floor: number, req: any): Promise<{
        created: number;
        rooms: any[];
    }>;
    findAll(roomTypeId?: string, floor?: string, status?: string, isEnabled?: string): Promise<({
        roomType: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            amenities: string[];
            basePrice: import("@prisma/client/runtime/library").Decimal;
            extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
            extraChildPrice: import("@prisma/client/runtime/library").Decimal;
            freeChildrenCount: number;
            maxAdults: number;
            maxChildren: number;
            isPubliclyVisible: boolean;
            images: string[];
        };
        bookings: {
            id: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            createdAt: Date;
            updatedAt: Date;
            roomTypeId: string;
            bookingNumber: string;
            checkInDate: Date;
            checkOutDate: Date;
            numberOfNights: number;
            adultsCount: number;
            childrenCount: number;
            baseAmount: import("@prisma/client/runtime/library").Decimal;
            extraAdultAmount: import("@prisma/client/runtime/library").Decimal;
            extraChildAmount: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            isPriceOverridden: boolean;
            overrideReason: string | null;
            specialRequests: string | null;
            isManualBooking: boolean;
            roomId: string;
            userId: string;
            bookingSourceId: string | null;
            agentId: string | null;
            commissionAmount: import("@prisma/client/runtime/library").Decimal;
            couponId: string | null;
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
        }[];
        blocks: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            startDate: Date;
            roomId: string;
            reason: string;
            endDate: Date;
            createdById: string;
        }[];
    } & {
        id: string;
        roomNumber: string;
        floor: number | null;
        status: import(".prisma/client").$Enums.RoomStatus;
        isEnabled: boolean;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        roomTypeId: string;
    })[]>;
    findOne(id: string): Promise<{
        roomType: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            amenities: string[];
            basePrice: import("@prisma/client/runtime/library").Decimal;
            extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
            extraChildPrice: import("@prisma/client/runtime/library").Decimal;
            freeChildrenCount: number;
            maxAdults: number;
            maxChildren: number;
            isPubliclyVisible: boolean;
            images: string[];
        };
        bookings: ({
            user: {
                email: string;
                firstName: string;
                lastName: string;
                phone: string | null;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            createdAt: Date;
            updatedAt: Date;
            roomTypeId: string;
            bookingNumber: string;
            checkInDate: Date;
            checkOutDate: Date;
            numberOfNights: number;
            adultsCount: number;
            childrenCount: number;
            baseAmount: import("@prisma/client/runtime/library").Decimal;
            extraAdultAmount: import("@prisma/client/runtime/library").Decimal;
            extraChildAmount: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            isPriceOverridden: boolean;
            overrideReason: string | null;
            specialRequests: string | null;
            isManualBooking: boolean;
            roomId: string;
            userId: string;
            bookingSourceId: string | null;
            agentId: string | null;
            commissionAmount: import("@prisma/client/runtime/library").Decimal;
            couponId: string | null;
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
        })[];
        blocks: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            startDate: Date;
            roomId: string;
            reason: string;
            endDate: Date;
            createdById: string;
        }[];
    } & {
        id: string;
        roomNumber: string;
        floor: number | null;
        status: import(".prisma/client").$Enums.RoomStatus;
        isEnabled: boolean;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        roomTypeId: string;
    }>;
    update(id: string, updateRoomDto: UpdateRoomDto, req: any): Promise<{
        roomType: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            amenities: string[];
            basePrice: import("@prisma/client/runtime/library").Decimal;
            extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
            extraChildPrice: import("@prisma/client/runtime/library").Decimal;
            freeChildrenCount: number;
            maxAdults: number;
            maxChildren: number;
            isPubliclyVisible: boolean;
            images: string[];
        };
    } & {
        id: string;
        roomNumber: string;
        floor: number | null;
        status: import(".prisma/client").$Enums.RoomStatus;
        isEnabled: boolean;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        roomTypeId: string;
    }>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
    blockRoom(id: string, blockRoomDto: BlockRoomDto, req: any): Promise<{
        room: {
            roomType: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                amenities: string[];
                basePrice: import("@prisma/client/runtime/library").Decimal;
                extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
                extraChildPrice: import("@prisma/client/runtime/library").Decimal;
                freeChildrenCount: number;
                maxAdults: number;
                maxChildren: number;
                isPubliclyVisible: boolean;
                images: string[];
            };
        } & {
            id: string;
            roomNumber: string;
            floor: number | null;
            status: import(".prisma/client").$Enums.RoomStatus;
            isEnabled: boolean;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            roomTypeId: string;
        };
        createdBy: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        roomId: string;
        reason: string;
        endDate: Date;
        createdById: string;
    }>;
    getRoomBlocks(id: string): Promise<({
        createdBy: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        roomId: string;
        reason: string;
        endDate: Date;
        createdById: string;
    })[]>;
    removeBlock(blockId: string, req: any): Promise<{
        message: string;
    }>;
}
