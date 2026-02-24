import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordManualPaymentDto {
    @ApiProperty({ example: 'booking-uuid' })
    @IsString()
    bookingId: string;

    @ApiProperty({ example: 1000 })
    @IsNumber()
    @Min(1)
    amount: number;

    @ApiProperty({ example: 'CASH', enum: ['CASH', 'UPI', 'CARD', 'OTHER'] })
    @IsString()
    method: string;

    @ApiProperty({ example: 'Guest paid at counter', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}
