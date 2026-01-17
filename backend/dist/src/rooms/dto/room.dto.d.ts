export declare class CreateRoomDto {
    roomNumber: string;
    floor: number;
    roomTypeId: string;
    notes?: string;
    isEnabled?: boolean;
}
export declare class UpdateRoomDto {
    roomNumber?: string;
    floor?: number;
    status?: string;
    notes?: string;
    isEnabled?: boolean;
    roomTypeId?: string;
}
export declare class BlockRoomDto {
    startDate: string;
    endDate: string;
    reason: string;
    notes?: string;
}
