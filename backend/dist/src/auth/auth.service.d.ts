import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<{
        roles: ({
            role: {
                permissions: ({
                    permission: {
                        id: string;
                        name: string;
                        description: string | null;
                        createdAt: Date;
                        module: string;
                    };
                } & {
                    roleId: string;
                    permissionId: string;
                    assignedAt: Date;
                })[];
            } & {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            roleId: string;
            assignedAt: Date;
            userId: string;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        isActive: boolean;
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: string;
        };
    }>;
    validateUser(userId: string): Promise<{
        bookings: ({
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
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
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
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
        })[];
        roles: ({
            role: {
                permissions: ({
                    permission: {
                        id: string;
                        name: string;
                        description: string | null;
                        createdAt: Date;
                        module: string;
                    };
                } & {
                    roleId: string;
                    permissionId: string;
                    assignedAt: Date;
                })[];
            } & {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            roleId: string;
            assignedAt: Date;
            userId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        isActive: boolean;
    }>;
}
