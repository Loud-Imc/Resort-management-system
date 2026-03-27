import { Controller, Post, Get, Patch, Body, Param, Headers, UseGuards, RawBodyRequest, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from './dto/payment.dto';
import { BookingStatus, PaymentStatus, RequestStatus } from '@prisma/client';
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

    @Post('manual/request')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PAYMENTS.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Request to record manual payment (Maker)' })
    requestManualPayment(@Body() dto: RecordManualPaymentDto, @Req() req: any) {
        return this.paymentsService.requestManualPayment(req.user, dto);
    }

    @Patch('manual/approve/:requestId')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.FINANCE.APPROVE_MANUAL_PAYMENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve manual payment request (Checker)' })
    approveManualPayment(@Param('requestId') requestId: string, @Req() req: any) {
        return this.paymentsService.approveManualPayment(req.user, requestId);
    }

    @Post('public/initiate-qr')
    @ApiOperation({ summary: 'Initiate QR payment (Public)' })
    initiateQrPayment(@Body() dto: { bookingId: string }) {
        return this.paymentsService.initiateQrPayment(dto.bookingId);
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

    @Post(':paymentId/refund/request')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PAYMENTS.REFUND)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Request a refund (Maker)' })
    requestRefund(
        @Req() req,
        @Param('paymentId') paymentId: string,
        @Body() dto: ProcessRefundDto,
    ) {
        return this.paymentsService.requestRefund(req.user, paymentId, dto.amount, dto.reason);
    }

    @Post('refund/requests/:requestId/approve')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.FINANCE.APPROVE_REFUND)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve and execute refund (Checker)' })
    approveRefund(
        @Req() req,
        @Param('requestId') requestId: string,
    ) {
        return this.paymentsService.approveRefund(req.user, requestId);
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

    @Get('refund/requests')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.FINANCE.APPROVE_REFUND)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all refund requests' })
    findAllRefundRequests(@Query('status') status?: RequestStatus) {
        return this.paymentsService.findAllRefundRequests(status);
    }
}
