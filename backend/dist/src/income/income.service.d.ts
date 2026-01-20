import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
import { AuditService } from '../audit/audit.service';
export declare class IncomeService {
    private prisma;
    private auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    create(createIncomeDto: CreateIncomeDto, userId: string): Promise<{
        booking: {
            bookingNumber: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        bookingId: string | null;
        updatedAt: Date;
        description: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        source: import(".prisma/client").$Enums.IncomeSource;
        date: Date;
    }>;
    findAll(filters?: {
        source?: string;
        startDate?: Date;
        endDate?: Date;
        bookingId?: string;
    }): Promise<({
        booking: {
            user: {
                firstName: string;
                lastName: string;
            };
            bookingNumber: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        bookingId: string | null;
        updatedAt: Date;
        description: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        source: import(".prisma/client").$Enums.IncomeSource;
        date: Date;
    })[]>;
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
        }) | null;
    } & {
        id: string;
        createdAt: Date;
        bookingId: string | null;
        updatedAt: Date;
        description: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        source: import(".prisma/client").$Enums.IncomeSource;
        date: Date;
    }>;
    update(id: string, updateIncomeDto: UpdateIncomeDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        bookingId: string | null;
        updatedAt: Date;
        description: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        source: import(".prisma/client").$Enums.IncomeSource;
        date: Date;
    }>;
    remove(id: string, userId: string): Promise<{
        message: string;
    }>;
    getSummary(startDate: Date, endDate: Date): Promise<{
        totalIncome: number;
        incomeCount: number;
        bySource: Record<string, number>;
        incomes: {
            id: string;
            createdAt: Date;
            bookingId: string | null;
            updatedAt: Date;
            description: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            source: import(".prisma/client").$Enums.IncomeSource;
            date: Date;
        }[];
    }>;
}
