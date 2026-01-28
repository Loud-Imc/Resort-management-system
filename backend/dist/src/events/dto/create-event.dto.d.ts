export declare enum EventOrganizerType {
    PROPERTY = "PROPERTY",
    EXTERNAL = "EXTERNAL"
}
export declare class CreateEventDto {
    title: string;
    description?: string;
    date: Date;
    location: string;
    price?: string;
    images: string[];
    organizerType: EventOrganizerType;
    propertyId?: string;
}
