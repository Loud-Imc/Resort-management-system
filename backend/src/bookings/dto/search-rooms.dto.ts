import { IsDateString, IsNotEmpty, IsNumber, Min, IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';
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

    @ApiProperty({ example: 0, required: false })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    infants?: number;

    @ApiProperty({ example: [5, 8], required: false, type: [Number], description: 'Ages of children (3-12). Mandatory if children > 0.' })
    @IsOptional()
    @Type(() => Number)
    childAges?: number[];

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

    @ApiProperty({ example: ['uuid-of-room-type'], required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roomTypeIds?: string[];

    @ApiProperty({ example: 'uuid-of-room-type', required: false })
    @IsOptional()
    @IsString()
    roomTypeId?: string;

    @ApiProperty({ example: ['uuid-of-room'], required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roomIds?: string[];

    @ApiProperty({ example: 'uuid-of-room', required: false })
    @IsOptional()
    @IsString()
    roomId?: string;

    @ApiProperty({ example: true, required: false, description: 'Whether to include nearest flexible date rate summaries (Defaults to true when propertyId is provided)' })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    includeFlexibleDates?: boolean;
}

export class FlexibleDateRateDto {
    @ApiProperty({ example: '2026-09-16' })
    checkInDate: string;

    @ApiProperty({ example: '2026-09-17' })
    checkOutDate: string;

    @ApiProperty({ example: 1 })
    stayLength: number;

    @ApiProperty({ example: 3000, nullable: true })
    price: number | null;

    @ApiProperty({ example: 3000, nullable: true })
    pricePerNight: number | null;

    @ApiProperty({ example: false })
    isSoldOut: boolean;

    @ApiProperty({ example: true })
    isSelected: boolean;

    @ApiProperty({ example: true })
    isCheapest: boolean;

    @ApiProperty({ example: 0, nullable: true })
    priceDifference: number | null;

    @ApiProperty({ example: true })
    hasSolution: boolean;
}

