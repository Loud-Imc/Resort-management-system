import { IsNotEmpty, IsDateString, IsString, IsOptional, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { GuestInfoDto } from './create-booking.dto';

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

    @ApiProperty({ example: 4500, required: false })
    @IsOptional()
    overrideTotal?: number;

    @ApiProperty({ example: 'Staff adjustment', required: false })
    @IsString()
    @IsOptional()
    overrideReason?: string;

    @ApiProperty({ example: 'room-type-uuid', required: false })
    @IsString()
    @IsOptional()
    roomTypeId?: string;

    @ApiProperty({ example: 2, required: false })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    adultsCount?: number;

    @ApiProperty({ example: 1, required: false })
    @IsInt()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    childrenCount?: number;

    @ApiProperty({ example: 'John Doe', required: false })
    @IsString()
    @IsOptional()
    guestName?: string;

    @ApiProperty({ example: 'john@example.com', required: false })
    @IsString()
    @IsOptional()
    guestEmail?: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsString()
    @IsOptional()
    guestPhone?: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsString()
    @IsOptional()
    whatsappNumber?: string;

    @ApiProperty({ type: [GuestInfoDto], required: false })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GuestInfoDto)
    @IsOptional()
    guests?: GuestInfoDto[];
}
