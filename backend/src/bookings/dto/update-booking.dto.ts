import { IsString, IsOptional, IsDateString, IsInt, Min, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { GuestInfoDto } from './create-booking.dto';

export class UpdateBookingDto {
    @ApiProperty({ example: '2026-02-01', required: false })
    @IsDateString()
    @IsOptional()
    checkInDate?: string;

    @ApiProperty({ example: '2026-02-05', required: false })
    @IsDateString()
    @IsOptional()
    checkOutDate?: string;

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

    @ApiProperty({ type: [GuestInfoDto], required: false })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GuestInfoDto)
    @IsOptional()
    guests?: GuestInfoDto[];

    @ApiProperty({ example: 'Late check-in requested', required: false })
    @IsString()
    @IsOptional()
    specialRequests?: string;

    @ApiProperty({ example: 15000, required: false })
    @IsNumber()
    @IsOptional()
    overrideTotal?: number;

    @ApiProperty({ example: 'Special corporate rate', required: false })
    @IsString()
    @IsOptional()
    overrideReason?: string;

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

    @ApiProperty({ example: '27AAAAA0000A1Z5', required: false })
    @IsString()
    @IsOptional()
    gstNumber?: string;
}
