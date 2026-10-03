import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, Min, ArrayMinSize, IsEnum, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateRoomTypeDto {
    @ApiProperty({ example: 'Deluxe Room' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Spacious room with ocean view', required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined)
    @Transform(({ value }) => (value === '' ? null : value))
    @IsString()
    description?: string | null;
    
    @ApiProperty({ example: 280, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(1)
    size?: number | null;

    @ApiProperty({ example: ['WiFi', 'AC', 'TV', 'Mini Bar'], type: [String] })
    @IsArray()
    @IsString({ each: true })
    amenities: string[];

    @ApiProperty({ example: 'AC_ONLY', enum: ['AC_ONLY', 'NON_AC_ONLY', 'BOTH'], required: false })
    @IsEnum(['AC_ONLY', 'NON_AC_ONLY', 'BOTH'])
    @IsOptional()
    acOption?: 'AC_ONLY' | 'NON_AC_ONLY' | 'BOTH';

    @ApiProperty({ example: 5000 })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    basePrice: number;

    @ApiProperty({ example: 6000, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(0)
    basePriceAc?: number | null;

    @ApiProperty({ example: 6000, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(0)
    originalPrice?: number | null;

    @ApiProperty({ example: 1000 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    extraAdultPrice: number;

    @ApiProperty({ example: 1200, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(0)
    extraAdultPriceAc?: number | null;

    @ApiProperty({ example: 500 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    extraChildPrice: number;

    @ApiProperty({ example: 600, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(0)
    extraChildPriceAc?: number | null;

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

    @ApiProperty({ example: 2, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(1)
    baseAdults?: number | null;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(0)
    baseChildren?: number | null;

    @ApiProperty({ example: 4, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(1)
    maxPhysicalAdults?: number | null;

    @ApiProperty({ example: 2, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(0)
    maxPhysicalChildren?: number | null;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(0)
    maxPhysicalInfants?: number | null;

    @ApiProperty({ example: 'V1', enum: ['V1', 'V2'], required: false })
    @IsString()
    @IsOptional()
    occupancyVersion?: string;

    @ApiProperty({ example: 3, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(1)
    totalBaseOccupancy?: number | null;

    @ApiProperty({ example: 4, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(1)
    totalMaxOccupancy?: number | null;

    @ApiProperty({ example: 2, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(1)
    baseMaxAdults?: number | null;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    @Min(0)
    baseMaxChildren?: number | null;

    @ApiProperty({ example: true })
    @IsBoolean()
    isPubliclyVisible: boolean;

    @ApiProperty({ example: ['https://example.com/room1.jpg'], type: [String] })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one image is required' })
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
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined)
    @Transform(({ value }) => (value === '' ? null : value))
    @IsString()
    cancellationPolicy?: string | null;

    @ApiProperty({ example: 'uuid-of-policy', required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined)
    @Transform(({ value }) => (value === '' ? null : value))
    @IsString()
    cancellationPolicyId?: string | null;

    @ApiProperty({ example: 'Selling Fast', required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined)
    @Transform(({ value }) => (value === '' ? null : value))
    @IsString()
    marketingBadgeText?: string | null;

    @ApiProperty({ example: 'URGENT', enum: ['URGENT', 'POSITIVE', 'NEUTRAL'], required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined)
    @Transform(({ value }) => (value === '' ? null : value))
    @IsString()
    marketingBadgeType?: string | null;

    @ApiProperty({ example: 'uuid-of-property' })
    @IsString()
    @IsNotEmpty()
    propertyId: string;

    @ApiProperty({ example: false, required: false })
    @IsBoolean()
    @IsOptional()
    isAvailableForGroupBooking?: boolean;

    @ApiProperty({ example: 6, required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
    @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
    @IsNumber()
    groupMaxOccupancy?: number | null;

    @ApiProperty({ example: false, required: false })
    @IsBoolean()
    @IsOptional()
    isGstInclusive?: boolean;

    @ApiProperty({ example: false, required: false })
    @IsBoolean()
    @IsOptional()
    allowPayAtProperty?: boolean;

    @ApiProperty({ example: 'EP', enum: ['EP', 'CP', 'MAP', 'AP'], required: false })
    @IsOptional()
    @IsEnum(['EP', 'CP', 'MAP', 'AP'])
    baseMealPlan?: 'EP' | 'CP' | 'MAP' | 'AP';

    @ApiProperty({ example: 'uuid-of-rate-plan', required: false })
    @IsOptional()
    @ValidateIf((o, v) => v !== null && v !== undefined)
    @Transform(({ value }) => (value === '' ? null : value))
    @IsString()
    baseRatePlanId?: string | null;
}
