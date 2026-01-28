import { UsersService } from './users.service';
import { CreateUserWithRoleDto } from './dto/create-user-with-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<({
        roles: ({
            role: {
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
        commissionPercentage: import("@prisma/client/runtime/library").Decimal | null;
    })[]>;
    create(createUserDto: CreateUserWithRoleDto): Promise<{
        roles: ({
            role: {
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
        commissionPercentage: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    findOne(id: string): Promise<{
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
                propertyId: string | null;
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
        commissionPercentage: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        roles: ({
            role: {
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
        commissionPercentage: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    assignRole(userId: string, roleId: string): Promise<{
        roleId: string;
        assignedAt: Date;
        userId: string;
    }>;
}
