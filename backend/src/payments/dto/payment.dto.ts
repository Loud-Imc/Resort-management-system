import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentDto {
    @ApiProperty({ example: 'booking-uuid' })
    @IsString()
    @IsNotEmpty()
    bookingId: string;
}

export class VerifyPaymentDto {
    @ApiProperty({ example: 'order_xxx' })
    @IsString()
    @IsNotEmpty()
    razorpayOrderId: string;

    @ApiProperty({ example: 'pay_xxx' })
    @IsString()
    @IsNotEmpty()
    razorpayPaymentId: string;

    @ApiProperty({ example: 'signature_xxx' })
    @IsString()
    @IsNotEmpty()
    razorpaySignature: string;
}

export class ProcessRefundDto {
    @ApiProperty({ example: 5000, required: false })
    @IsNumber()
    @IsOptional()
    amount?: number;

    @ApiProperty({ example: 'Customer requested cancellation', required: false })
    @IsString()
    @IsOptional()
    reason?: string;
}
