import { CreateEventDto } from './create-event.dto';
export declare enum EventStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}
declare const UpdateEventDto_base: import("@nestjs/common").Type<Partial<CreateEventDto>>;
export declare class UpdateEventDto extends UpdateEventDto_base {
    status?: EventStatus;
}
export {};
