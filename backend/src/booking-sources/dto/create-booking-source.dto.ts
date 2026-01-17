import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingSourceDto {
    @ApiProperty({ example: 'Booking.com' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Online Travel Agency', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 15.0, description: 'Commission percentage (0-100)', required: false })
    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    commission?: number;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
