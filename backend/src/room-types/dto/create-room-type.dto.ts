import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRoomTypeDto {
    @ApiProperty({ example: 'Deluxe Room' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Spacious room with ocean view', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: ['WiFi', 'AC', 'TV', 'Mini Bar'], type: [String] })
    @IsArray()
    @IsString({ each: true })
    amenities: string[];

    @ApiProperty({ example: 5000 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    basePrice: number;

    @ApiProperty({ example: 1000 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    extraAdultPrice: number;

    @ApiProperty({ example: 500 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    extraChildPrice: number;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    freeChildrenCount: number;

    @ApiProperty({ example: 3 })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    maxAdults: number;

    @ApiProperty({ example: 2 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    maxChildren: number;

    @ApiProperty({ example: true })
    @IsBoolean()
    isPubliclyVisible: boolean;

    @ApiProperty({ example: ['https://example.com/room1.jpg'], type: [String] })
    @IsArray()
    @IsString({ each: true })
    images: string[];

    @ApiProperty({ example: ['Ocean View', 'Private Balcony'], type: [String], required: false })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    highlights?: string[];

    @ApiProperty({ example: ['Breakfast included', 'Spa access'], type: [String], required: false })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    inclusions?: string[];

    @ApiProperty({ example: 'Free cancellation until 24h before check-in', required: false })
    @IsString()
    @IsOptional()
    cancellationPolicy?: string;

    @ApiProperty({ example: 'uuid-of-policy', required: false })
    @IsString()
    @IsOptional()
    cancellationPolicyId?: string;

    @ApiProperty({ example: 'Selling Fast', required: false })
    @IsString()
    @IsOptional()
    marketingBadgeText?: string;

    @ApiProperty({ example: 'URGENT', enum: ['URGENT', 'POSITIVE', 'NEUTRAL'], required: false })
    @IsString()
    @IsOptional()
    marketingBadgeType?: string;

    @ApiProperty({ example: 'uuid-of-property' })
    @IsString()
    @IsNotEmpty()
    propertyId: string;
}
