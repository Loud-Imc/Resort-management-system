import { IsNotEmpty, IsDateString, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleBookingDto {
    @ApiProperty({ example: '2026-06-15' })
    @IsDateString()
    @IsNotEmpty()
    checkInDate: string;

    @ApiProperty({ example: '2026-06-20' })
    @IsDateString()
    @IsNotEmpty()
    checkOutDate: string;

    @ApiProperty({ example: ['room-uuid'], required: false })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    selectedRoomIds?: string[];
}
