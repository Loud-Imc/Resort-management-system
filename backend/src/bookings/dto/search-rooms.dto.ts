import { IsDateString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
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

    @ApiProperty({ example: 'Wayanad', required: false })
    @IsOptional()
    location?: string;

    @ApiProperty({ example: 'RESORT', required: false })
    @IsOptional()
    type?: string;
}
