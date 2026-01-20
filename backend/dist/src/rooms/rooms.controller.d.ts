import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto, BlockRoomDto } from './dto/room.dto';
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
    create(createRoomDto: CreateRoomDto, req: any): Promise<{
        roomType: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
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
        createdAt: Date;
        updatedAt: Date;
        roomNumber: string;
        floor: number | null;
        roomTypeId: string;
        notes: string | null;
        isEnabled: boolean;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    bulkCreate(roomTypeId: string, startNumber: number, count: number, floor: number, req: any): Promise<{
        created: number;
        rooms: any[];
    }>;
    findAll(roomTypeId?: string, floor?: string, status?: string, isEnabled?: string): Promise<({
        bookings: {
            id: string;
            createdAt: Date;
            userId: string;
            updatedAt: Date;
            roomTypeId: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            checkInDate: Date;
            roomId: string;
            bookingNumber: string;
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
            bookingSourceId: string | null;
            agentId: string | null;
            commissionAmount: import("@prisma/client/runtime/library").Decimal;
            couponId: string | null;
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
        }[];
        roomType: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
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
        blocks: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            startDate: Date;
            roomId: string;
            reason: string;
            endDate: Date;
            createdById: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        roomNumber: string;
        floor: number | null;
        roomTypeId: string;
        notes: string | null;
        isEnabled: boolean;
        status: import(".prisma/client").$Enums.RoomStatus;
    })[]>;
    findOne(id: string): Promise<{
        bookings: ({
            user: {
                email: string;
                firstName: string;
                lastName: string;
                phone: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            updatedAt: Date;
            roomTypeId: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            checkInDate: Date;
            roomId: string;
            bookingNumber: string;
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
            bookingSourceId: string | null;
            agentId: string | null;
            commissionAmount: import("@prisma/client/runtime/library").Decimal;
            couponId: string | null;
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
        })[];
        roomType: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
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
        blocks: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            startDate: Date;
            roomId: string;
            reason: string;
            endDate: Date;
            createdById: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        roomNumber: string;
        floor: number | null;
        roomTypeId: string;
        notes: string | null;
        isEnabled: boolean;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    update(id: string, updateRoomDto: UpdateRoomDto, req: any): Promise<{
        roomType: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
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
        createdAt: Date;
        updatedAt: Date;
        roomNumber: string;
        floor: number | null;
        roomTypeId: string;
        notes: string | null;
        isEnabled: boolean;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
    blockRoom(id: string, blockRoomDto: BlockRoomDto, req: any): Promise<{
        room: {
            roomType: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
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
            createdAt: Date;
            updatedAt: Date;
            roomNumber: string;
            floor: number | null;
            roomTypeId: string;
            notes: string | null;
            isEnabled: boolean;
            status: import(".prisma/client").$Enums.RoomStatus;
        };
        createdBy: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
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
