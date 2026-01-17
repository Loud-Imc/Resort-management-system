import { PrismaService } from '../prisma/prisma.service';
export declare class AvailabilityService {
    private prisma;
    constructor(prisma: PrismaService);
    checkAvailability(roomTypeId: string, checkInDate: Date, checkOutDate: Date): Promise<boolean>;
    getAvailableRooms(roomTypeId: string, checkInDate: Date, checkOutDate: Date): Promise<any[]>;
    private isRoomAvailable;
    getAvailableRoomCount(roomTypeId: string, checkInDate: Date, checkOutDate: Date): Promise<number>;
    searchAvailableRoomTypes(checkInDate: Date, checkOutDate: Date, adults: number, children: number): Promise<any[]>;
}
