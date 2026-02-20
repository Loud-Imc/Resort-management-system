import { IsDateString, IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';
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
}
