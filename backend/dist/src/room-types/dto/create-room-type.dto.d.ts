export declare class CreateRoomTypeDto {
    name: string;
    description?: string;
    amenities: string[];
    basePrice: number;
    extraAdultPrice: number;
    extraChildPrice: number;
    freeChildrenCount: number;
    maxAdults: number;
    maxChildren: number;
    isPubliclyVisible: boolean;
    images: string[];
}
