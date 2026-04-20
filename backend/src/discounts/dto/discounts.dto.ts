import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDateString, Min, IsArray, ArrayNotEmpty } from 'class-validator';

export enum DiscountType {
    PERCENTAGE = 'PERCENTAGE',
    FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export class CreateCouponDto {
    @ApiProperty({ example: 'SAVE20' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'Flat 20% off' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
    @IsEnum(DiscountType)
    discountType: DiscountType;

    @ApiProperty({ example: 20 })
    @IsNumber()
    @Min(0)
    discountValue: number;

    @ApiProperty({ example: '2026-01-01T00:00:00Z' })
    @IsDateString()
    validFrom: string;

    @ApiProperty({ example: '2026-12-31T23:59:59Z' })
    @IsDateString()
    validUntil: string;

    @ApiProperty({ example: 1000 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    maxUses?: number;

    @ApiProperty({ example: 5000 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    minBookingAmount?: number;

    @ApiProperty({ example: true })
    @IsOptional()
    isActive?: boolean;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) { }

export class CreateOfferDto {
    @ApiProperty({ example: 'Inaugural Offer' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Special discount for early birds' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
    @IsEnum(DiscountType)
    @IsOptional()
    discountType?: DiscountType;

    @ApiProperty({ example: 15 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountValue: number;

    @ApiProperty({ example: '2026-02-10T00:00:00Z' })
    @IsOptional()
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2026-03-10T23:59:59Z' })
    @IsOptional()
    @IsDateString()
    endDate: string;

    @ApiProperty({ example: ['room-type-uuid-1', 'room-type-uuid-2'] })
    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    roomTypeIds: string[];

    @ApiProperty({ example: true })
    @IsOptional()
    isActive?: boolean;
}

export class UpdateOfferDto extends PartialType(CreateOfferDto) { }
