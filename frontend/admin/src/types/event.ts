export interface Event {
    id: string;
    title: string;
    description?: string;
    date: string;
    location: string;
    price?: string;
    images: string[];
    isActive: boolean;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    organizerType: 'PROPERTY' | 'EXTERNAL';
    propertyId?: string;
    property?: {
        id: string;
        name: string;
    };
    createdById: string;
    createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateEventDto {
    title: string;
    description?: string;
    date: string;
    location: string;
    price?: string;
    images: string[];
    organizerType: 'PROPERTY' | 'EXTERNAL';
    propertyId?: string;
}
