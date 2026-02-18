import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAsChannelPartnerDto {
    // No additional fields needed - uses current user's ID
}

export class ApplyReferralCodeDto {
    @ApiProperty({ example: 'CP-A1B2C3' })
    @IsString()
    referralCode: string;
}

export class UpdateCommissionRateDto {
    @ApiProperty({ example: 5.0 })
    @IsNumber()
    commissionRate: number;
}

export class CPPayoutRequestDto {
    @ApiProperty({ example: 500.00 })
    @IsNumber()
    amount: number;

    @ApiProperty({ example: 'Bank transfer to SBI account' })
    @IsOptional()
    @IsString()
    notes?: string;
}
export class UpdateReferralDiscountRateDto {
    @ApiProperty({ example: 10.0 })
    @IsNumber()
    referralDiscountRate: number;
}
