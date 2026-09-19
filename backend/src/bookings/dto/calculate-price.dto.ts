import { IsString, IsNotEmpty, IsDateString, IsInt, Min, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RoomAllocationItemDto } from './create-booking.dto';

export class CalculatePriceDto {
    @ApiProperty({ example: 'room-type-uuid', required: false })
    @IsString()
    @IsOptional()
    roomTypeId?: string;

    @ApiProperty({ example: 'property-uuid', required: false })
    @IsString()
    @IsOptional()
    propertyId?: string;

    @ApiProperty({ type: () => [RoomAllocationItemDto], required: false })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => RoomAllocationItemDto)
    roomAllocations?: RoomAllocationItemDto[];

    @ApiProperty({ example: '2026-02-01' })
    @IsDateString()
    @IsNotEmpty()
    checkInDate: string;

    @ApiProperty({ example: '2026-02-05' })
    @IsDateString()
    @IsNotEmpty()
    checkOutDate: string;

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

    @ApiProperty({ example: 0, required: false })
    @IsInt()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    extraAdultsCount?: number;

    @ApiProperty({ example: 0, required: false })
    @IsInt()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    extraChildrenCount?: number;

    @ApiProperty({ example: 0, required: false })
    @IsInt()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    infantsCount?: number;

    @ApiProperty({ example: [5, 8], required: false, type: [Number], description: 'Ages of children (3-12). Mandatory if childrenCount > 0.' })
    @IsOptional()
    @Type(() => Number)
    childAges?: number[];

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

    @ApiProperty({ example: 1, required: false })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    roomsCount?: number;

    @ApiProperty({ example: 5000, required: false })
    @IsOptional()
    @Type(() => Number)
    overrideTotal?: number;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isOverrideInclusive?: boolean;
}
