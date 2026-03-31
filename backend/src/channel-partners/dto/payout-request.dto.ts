import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayoutRequestDto {
    @ApiProperty({ example: 1000, description: 'Amount to claim/redeem' })
    @IsNumber()
    @IsNotEmpty()
    @Min(100)
    amount: number;
}
