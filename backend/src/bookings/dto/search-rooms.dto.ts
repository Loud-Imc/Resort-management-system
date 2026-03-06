import { IsDateString, IsNotEmpty, IsNumber, Min, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchRoomsDto {
    @ApiProperty({ example: '2026-02-01' })
    @IsDateString()
    @IsNotEmpty()
    checkInDate: string;

    @ApiProperty({ example: '2026-02-05' })
    @IsDateString()
    @IsNotEmpty()
    checkOutDate: string;

    @ApiProperty({ example: 2 })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    adults: number;

    @ApiProperty({ example: 0 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    children: number;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    rooms?: number;

    @ApiProperty({ example: 'Wayanad', required: false })
    @IsOptional()
    location?: string;

    @ApiProperty({ example: 'RESORT', required: false })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({ example: 'uuid-of-category', required: false })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @Type(() => Boolean)
    includeSoldOut?: boolean;

    @ApiProperty({ example: 'uuid-of-property', required: false })
    @IsOptional()
    @IsString()
    propertyId?: string;

    @ApiProperty({ example: 11.6892, required: false })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    latitude?: number;

    @ApiProperty({ example: 76.0432, required: false })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    longitude?: number;

    @ApiProperty({ example: 50, required: false })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    radius?: number;

    @ApiProperty({ example: 'INR', required: false })
    @IsOptional()
    @IsString()
    @Type(() => String)
    currency?: string;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isGroupBooking?: boolean;

    @ApiProperty({ example: 10, required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    groupSize?: number;
}
