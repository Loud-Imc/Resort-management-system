import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EventStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
}

export class UpdateEventDto extends PartialType(CreateEventDto) {
    @ApiProperty({ enum: EventStatus, required: false })
    @IsEnum(EventStatus)
    @IsOptional()
    status?: EventStatus;
}
