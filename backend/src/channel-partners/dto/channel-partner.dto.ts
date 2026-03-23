import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
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
    @ApiProperty({ description: 'New override commission rate percentage (nullable)', required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(50)
    overrideCommissionRate?: number | null;
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
