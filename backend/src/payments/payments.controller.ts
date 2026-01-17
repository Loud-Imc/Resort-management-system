import { Controller, Post, Get, Body, Param, Headers, UseGuards, RawBodyRequest, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('initiate')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Initiate payment - Create Razorpay order' })
    initiatePayment(@Body() dto: InitiatePaymentDto) {
        return this.paymentsService.initiatePayment(dto.bookingId);
    }

    @Post('public/initiate')
    @ApiOperation({ summary: 'Initiate payment (Public)' })
    initiatePublicPayment(@Body() dto: InitiatePaymentDto) {
        return this.paymentsService.initiatePayment(dto.bookingId);
    }

    @Post('verify')
    @ApiOperation({ summary: 'Verify payment signature (Public)' })
    verifyPayment(@Body() dto: VerifyPaymentDto) {
        return this.paymentsService.verifyPayment(
            dto.razorpayOrderId,
            dto.razorpayPaymentId,
            dto.razorpaySignature,
        );
    }

    @Post('webhook')
    @ApiOperation({ summary: 'Razorpay webhook handler' })
    async handleWebhook(
        @Headers('x-razorpay-signature') signature: string,
        @Req() req: any,
    ) {
        return this.paymentsService.handleWebhook(req.body, signature);
    }

    @Post(':paymentId/refund')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Process refund (Admin only)' })
    processRefund(
        @Param('paymentId') paymentId: string,
        @Body() dto: ProcessRefundDto,
    ) {
        return this.paymentsService.processRefund(paymentId, dto.amount, dto.reason);
    }

    @Get('booking/:bookingId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get payment details for a booking' })
    getPaymentDetails(@Param('bookingId') bookingId: string) {
        return this.paymentsService.getPaymentDetails(bookingId);
    }
    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SuperAdmin', 'Admin', 'Manager')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all payments' })
    findAll() {
        return this.paymentsService.findAll();
    }
}
