import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto, BlockRoomDto } from './dto/room.dto';
import { AuditService } from '../audit/audit.service';
export declare class RoomsService {
    private prisma;
    private auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    create(createRoomDto: CreateRoomDto, userId: string): Promise<{
        roomType: {
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
        };
    } & {
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
    }>;
    findAll(filters?: {
        roomTypeId?: string;
        floor?: number;
        status?: string;
        isEnabled?: boolean;
    }): Promise<({
        bookings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            propertyId: string | null;
            status: import(".prisma/client").$Enums.BookingStatus;
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
            bookingSourceId: string | null;
            agentId: string | null;
            commissionAmount: import("@prisma/client/runtime/library").Decimal;
            couponId: string | null;
            channelPartnerId: string | null;
            cpCommission: import("@prisma/client/runtime/library").Decimal | null;
            cpDiscount: import("@prisma/client/runtime/library").Decimal | null;
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
        }[];
        roomType: {
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
        };
        blocks: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            roomId: string;
            startDate: Date;
            endDate: Date;
            reason: string;
            createdById: string;
        }[];
    } & {
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
            updatedAt: Date;
            userId: string;
            propertyId: string | null;
            status: import(".prisma/client").$Enums.BookingStatus;
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
            bookingSourceId: string | null;
            agentId: string | null;
            commissionAmount: import("@prisma/client/runtime/library").Decimal;
            couponId: string | null;
            channelPartnerId: string | null;
            cpCommission: import("@prisma/client/runtime/library").Decimal | null;
            cpDiscount: import("@prisma/client/runtime/library").Decimal | null;
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
        })[];
        roomType: {
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
        };
        blocks: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            roomId: string;
            startDate: Date;
            endDate: Date;
            reason: string;
            createdById: string;
        }[];
    } & {
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
    }>;
    update(id: string, updateRoomDto: UpdateRoomDto, userId: string): Promise<{
        roomType: {
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
        };
    } & {
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
    }>;
    remove(id: string, userId: string): Promise<{
        message: string;
    }>;
    blockRoom(roomId: string, blockRoomDto: BlockRoomDto, userId: string): Promise<{
        room: {
            roomType: {
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
            };
        } & {
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
        roomId: string;
        startDate: Date;
        endDate: Date;
        reason: string;
        createdById: string;
    }>;
    removeBlock(blockId: string, userId: string): Promise<{
        message: string;
    }>;
    getRoomBlocks(roomId: string): Promise<({
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
        roomId: string;
        startDate: Date;
        endDate: Date;
        reason: string;
        createdById: string;
    })[]>;
    bulkCreate(roomTypeId: string, startNumber: number, count: number, floor: number, userId: string): Promise<{
        created: number;
        rooms: any[];
    }>;
}
