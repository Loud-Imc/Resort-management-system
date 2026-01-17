import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateIncomeDto {
    @ApiProperty({ example: 15000 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    amount: number;

    @ApiProperty({ example: 'Event Hall Booking' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ example: 'OTHER' })
    @IsString()
    @IsNotEmpty()
    source: string;

    @ApiProperty({ example: '2026-01-15', required: false })
    @IsDateString()
    @IsOptional()
    date?: string;

    @ApiProperty({ example: 'booking-uuid', required: false })
    @IsString()
    @IsOptional()
    bookingId?: string;
}

export class UpdateIncomeDto {
    @ApiProperty({ example: 16000, required: false })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    amount?: number;

    @ApiProperty({ example: 'Updated description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'OTHER', required: false })
    @IsString()
    @IsOptional()
    source?: string;

    @ApiProperty({ example: '2026-01-15', required: false })
    @IsDateString()
    @IsOptional()
    date?: string;
}
