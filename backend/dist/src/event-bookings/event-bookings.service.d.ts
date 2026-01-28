import { PrismaService } from '../prisma/prisma.service';
import { CreateEventBookingDto } from './dto/create-event-booking.dto';
export declare class EventBookingsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createEventBookingDto: CreateEventBookingDto, userId: string): Promise<{
        event: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            images: string[];
            propertyId: string | null;
            status: import(".prisma/client").$Enums.EventStatus;
            title: string;
            createdById: string;
            date: Date;
            location: string;
            price: string | null;
            organizerType: import(".prisma/client").$Enums.EventOrganizerType;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.EventBookingStatus;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        ticketId: string;
        eventId: string;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        checkedIn: boolean;
        checkInTime: Date | null;
    }>;
    findAll(userId: string): Promise<({
        event: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            images: string[];
            propertyId: string | null;
            status: import(".prisma/client").$Enums.EventStatus;
            title: string;
            createdById: string;
            date: Date;
            location: string;
            price: string | null;
            organizerType: import(".prisma/client").$Enums.EventOrganizerType;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.EventBookingStatus;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        ticketId: string;
        eventId: string;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        checkedIn: boolean;
        checkInTime: Date | null;
    })[]>;
    findOne(id: string, userId: string): Promise<{
        event: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            images: string[];
            propertyId: string | null;
            status: import(".prisma/client").$Enums.EventStatus;
            title: string;
            createdById: string;
            date: Date;
            location: string;
            price: string | null;
            organizerType: import(".prisma/client").$Enums.EventOrganizerType;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.EventBookingStatus;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        ticketId: string;
        eventId: string;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        checkedIn: boolean;
        checkInTime: Date | null;
    }>;
    verifyTicket(ticketId: string, staffUserId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.EventBookingStatus;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        ticketId: string;
        eventId: string;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        checkedIn: boolean;
        checkInTime: Date | null;
    }>;
    findAllAdmin(): Promise<({
        user: {
            email: string;
            firstName: string;
            lastName: string;
        };
        event: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            images: string[];
            propertyId: string | null;
            status: import(".prisma/client").$Enums.EventStatus;
            title: string;
            createdById: string;
            date: Date;
            location: string;
            price: string | null;
            organizerType: import(".prisma/client").$Enums.EventOrganizerType;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.EventBookingStatus;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        ticketId: string;
        eventId: string;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        checkedIn: boolean;
        checkInTime: Date | null;
    })[]>;
}
