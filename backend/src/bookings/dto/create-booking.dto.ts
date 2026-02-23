import { IsString, IsNotEmpty, IsDateString, IsInt, Min, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GuestInfoDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty({ example: 'john@example.com', required: false })
    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsString()
    @IsOptional()
    whatsappNumber?: string;

    @ApiProperty({ example: 30, required: false })
    @IsInt()
    @IsOptional()
    age?: number;

    @ApiProperty({ example: 'Passport', required: false })
    @IsString()
    @IsOptional()
    idType?: string;

    @ApiProperty({ example: 'AB1234567', required: false })
    @IsString()
    @IsOptional()
    idNumber?: string;

    @ApiProperty({ example: 'https://example.com/id.jpg', required: false })
    @IsString()
    @IsOptional()
    idImage?: string;
}

export class CreateBookingDto {
    @ApiProperty({ example: 'room-type-uuid' })
    @IsString()
    @IsNotEmpty()
    roomTypeId: string;

    @ApiProperty({ example: 'room-uuid', required: false })
    @IsString()
    @IsOptional()
    roomId?: string;

    @ApiProperty({ example: '2026-02-01' })
    @IsDateString()
    @IsNotEmpty()
    checkInDate: string;

    @ApiProperty({ example: '2026-02-05' })
    @IsDateString()
    @IsNotEmpty()
    checkOutDate: string;

    @ApiProperty({ example: 2 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    adultsCount: number;

    @ApiProperty({ example: 1 })
    @IsInt()
    @Min(0)
    @Type(() => Number)
    childrenCount: number;

    @ApiProperty({ type: [GuestInfoDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GuestInfoDto)
    guests: GuestInfoDto[];

    @ApiProperty({ example: 'Late check-in requested', required: false })
    @IsString()
    @IsOptional()
    specialRequests?: string;

    @ApiProperty({ example: 'SUMMER2026', required: false })
    @IsString()
    @IsOptional()
    couponCode?: string;

    @ApiProperty({ example: 'booking-source-uuid', required: false })
    @IsString()
    @IsOptional()
    bookingSourceId?: string;

    // For manual bookings only
    @ApiProperty({ example: false, required: false })
    @IsBoolean()
    @IsOptional()
    isManualBooking?: boolean;

    @ApiProperty({ example: 15000, required: false })
    @IsNumber()
    @IsOptional()
    overrideTotal?: number;

    @ApiProperty({ example: 'Special corporate rate', required: false })
    @IsString()
    @IsOptional()
    overrideReason?: string;

    @ApiProperty({ example: 'agent-uuid', required: false })
    @IsString()
    @IsOptional()
    agentId?: string;

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

    @ApiProperty({ example: 'REF123', required: false })
    @IsString()
    @IsOptional()
    referralCode?: string;

    @ApiProperty({ example: 'ONLINE', required: false, enum: ['ONLINE', 'WALLET'] })
    @IsString()
    @IsOptional()
    paymentMethod?: 'ONLINE' | 'WALLET';

    @ApiProperty({ example: 'FULL', required: false, enum: ['FULL', 'PARTIAL'] })
    @IsString()
    @IsOptional()
    paymentOption?: 'FULL' | 'PARTIAL';

    @ApiProperty({ example: 'AED', required: false })
    @IsString()
    @IsOptional()
    currency?: string;
}
