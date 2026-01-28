import { EventBookingsService } from './event-bookings.service';
import { CreateEventBookingDto } from './dto/create-event-booking.dto';
export declare class EventBookingsController {
    private readonly eventBookingsService;
    constructor(eventBookingsService: EventBookingsService);
    create(createEventBookingDto: CreateEventBookingDto, req: any): Promise<{
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
    findAll(req: any): Promise<({
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
    findOne(id: string, req: any): Promise<{
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
    verify(ticketId: string, req: any): Promise<{
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
