import { Controller, Post, Get, Body, Param, Headers, UseGuards, RawBodyRequest, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('initiate')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Initiate payment - Create Razorpay order' })
    initiatePayment(@Body() dto: InitiatePaymentDto) {
        return this.paymentsService.initiatePayment(dto.bookingId, dto.eventBookingId);
    }

    @Post('manual')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PAYMENTS.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Record manual payment (Cash, UPI, etc.)' })
    recordManualPayment(@Body() dto: RecordManualPaymentDto, @Req() req: any) {
        return this.paymentsService.recordManualPayment(dto, req.user.id);
    }

    @Post('public/initiate')
    @ApiOperation({ summary: 'Initiate payment (Public)' })
    initiatePublicPayment(@Body() dto: InitiatePaymentDto) {
        return this.paymentsService.initiatePayment(dto.bookingId, dto.eventBookingId);
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
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PAYMENTS.REFUND)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Process refund' })
    processRefund(
        @Param('paymentId') paymentId: string,
        @Body() dto: ProcessRefundDto,
    ) {
        return this.paymentsService.processRefund(paymentId, dto.amount, dto.reason);
    }

    @Post(':paymentId/payout/confirm')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PAYMENTS.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Confirm payout to property' })
    confirmPayout(@Param('paymentId') paymentId: string) {
        return this.paymentsService.confirmPayout(paymentId);
    }

    @Get('booking/:bookingId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get payment details for a booking' })
    getPaymentDetails(@Param('bookingId') bookingId: string) {
        return this.paymentsService.getPaymentDetails(bookingId);
    }
    @Get('stats')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PAYMENTS.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get payment statistics' })
    getStats(@Req() req, @Query('propertyId') propertyId?: string) {
        return this.paymentsService.getStats(req.user, propertyId);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PAYMENTS.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all payments' })
    findAll(@Req() req, @Query('propertyId') propertyId?: string) {
        return this.paymentsService.findAll(req.user, propertyId);
    }
}
