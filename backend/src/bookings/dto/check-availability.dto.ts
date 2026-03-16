import { IsString, IsNotEmpty, IsDateString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CheckAvailabilityDto {
    @ApiProperty({ example: 'room-type-uuid', required: false })
    @IsString()
    @IsOptional()
    roomTypeId?: string;

    @ApiProperty({ example: '2026-02-01' })
    @IsDateString()
    @IsNotEmpty()
    checkInDate: string;

    @ApiProperty({ example: '2026-02-05' })
    @IsDateString()
    @IsNotEmpty()
    checkOutDate: string;

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

    @ApiProperty({ example: 'property-uuid', required: false })
    @IsString()
    @IsOptional()
    propertyId?: string;
}
