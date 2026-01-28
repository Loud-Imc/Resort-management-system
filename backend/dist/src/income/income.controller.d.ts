import { IncomeService } from './income.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
export declare class IncomeController {
    private readonly incomeService;
    constructor(incomeService: IncomeService);
    create(createIncomeDto: CreateIncomeDto, req: any): Promise<{
        booking: {
            bookingNumber: string;
        } | null;
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        source: import(".prisma/client").$Enums.IncomeSource;
        date: Date;
        eventBookingId: string | null;
    }>;
    findAll(source?: string, startDate?: string, endDate?: string, bookingId?: string): Promise<({
        booking: {
            user: {
                firstName: string;
                lastName: string;
            };
            bookingNumber: string;
        } | null;
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        source: import(".prisma/client").$Enums.IncomeSource;
        date: Date;
        eventBookingId: string | null;
    })[]>;
    getSummary(startDate: string, endDate: string): Promise<{
        totalIncome: number;
        incomeCount: number;
        bySource: Record<string, number>;
        incomes: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            bookingId: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            source: import(".prisma/client").$Enums.IncomeSource;
            date: Date;
            eventBookingId: string | null;
        }[];
    }>;
    findOne(id: string): Promise<{
        booking: ({
            user: {
                email: string;
                firstName: string;
                lastName: string;
            };
            roomType: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            propertyId: string | null;
            status: import(".prisma/client").$Enums.BookingStatus;
            roomTypeId: string;
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
            channelPartnerId: string | null;
            cpCommission: import("@prisma/client/runtime/library").Decimal | null;
            cpDiscount: import("@prisma/client/runtime/library").Decimal | null;
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
        }) | null;
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        source: import(".prisma/client").$Enums.IncomeSource;
        date: Date;
        eventBookingId: string | null;
    }>;
    update(id: string, updateIncomeDto: UpdateIncomeDto, req: any): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        source: import(".prisma/client").$Enums.IncomeSource;
        date: Date;
        eventBookingId: string | null;
    }>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
}
