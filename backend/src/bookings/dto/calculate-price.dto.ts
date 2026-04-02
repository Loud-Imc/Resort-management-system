import { IsString, IsNotEmpty, IsDateString, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CalculatePriceDto {
    @ApiProperty({ example: 'room-type-uuid' })
    @IsString()
    @IsNotEmpty()
    roomTypeId: string;

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

    @ApiProperty({ example: 'SUMMER2026', required: false })
    @IsString()
    @IsOptional()
    couponCode?: string;

    @ApiProperty({ example: 'REF123', required: false })
    @IsString()
    @IsOptional()
    referralCode?: string;

    @ApiProperty({ example: 'ANYCODE', required: false })
    @IsString()
    @IsOptional()
    generalCode?: string;

    @ApiProperty({ example: 'AED', required: false })
    @IsString()
    @IsOptional()
    currency?: string;

    @ApiProperty({ example: false, required: false })
    @IsBoolean()
    @IsOptional()
    isGroupBooking?: boolean;

    @ApiProperty({ example: 10, required: false })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    groupSize?: number;

    @ApiProperty({ example: 1, required: false })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    roomCount?: number;
}
