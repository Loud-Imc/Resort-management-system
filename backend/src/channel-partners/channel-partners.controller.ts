import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChannelPartnersService } from './channel-partners.service';
import { ApplyReferralCodeDto, UpdateCommissionRateDto, UpdateReferralDiscountRateDto } from './dto/channel-partner.dto';
import { RegisterChannelPartnerDto } from './dto/register-channel-partner.dto';
import { ChannelPartnerStatus, RedemptionStatus } from '@prisma/client';
import { UpdateCPProfileDto } from './dto/update-cp-profile.dto';

@ApiTags('Channel Partners')
@Controller('channel-partners')
export class ChannelPartnersController {
    constructor(private readonly cpService: ChannelPartnersService) { }

    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================

    @Post('public-register')
    @ApiOperation({ summary: 'Public registration for Channel Partners' })
    publicRegister(@Body() dto: RegisterChannelPartnerDto) {
        return this.cpService.publicRegister(dto);
    }

    @Get('validate/:code')
    @ApiOperation({ summary: 'Validate a referral code' })
    validateCode(@Param('code') code: string) {
        return this.cpService.findByReferralCode(code);
    }

    @Post('registration-payment/initiate')
    @ApiOperation({ summary: 'Initiate registration fee payment' })
    initiateRegistrationPayment(@Body('channelPartnerId') channelPartnerId: string) {
        return this.cpService.initiateRegistrationPayment(channelPartnerId);
    }

    @Post('registration-payment/verify')
    @ApiOperation({ summary: 'Verify registration fee payment' })
    verifyRegistrationPayment(
        @Body('channelPartnerId') channelPartnerId: string,
        @Body('razorpayOrderId') razorpayOrderId: string,
        @Body('razorpayPaymentId') razorpayPaymentId: string,
        @Body('razorpaySignature') razorpaySignature: string,
    ) {
        return this.cpService.verifyRegistrationPayment(
            channelPartnerId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        );
    }

    // ============================================
    // AUTHENTICATED ENDPOINTS
    // ============================================

    @Post('register')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Register as a Channel Partner (Current User)' })
    register(@Request() req) {
        return this.cpService.register(req.user.id);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my CP profile' })
    getMyProfile(@Request() req) {
        return this.cpService.getMyProfile(req.user.id);
    }

    @Get('me/stats')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my CP dashboard stats' })
    getStats(@Request() req) {
        return this.cpService.getStats(req.user.id);
    }

    @Post('me/top-up/initiate')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Initiate wallet top-up via Razorpay' })
    initiateTopUp(@Request() req, @Body('amount') amount: number) {
        return this.cpService.initiateWalletTopUp(req.user.id, Number(amount));
    }

    @Post('me/top-up/verify')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify Razorpay payment and credit wallet' })
    verifyTopUp(
        @Request() req,
        @Body('razorpayOrderId') razorpayOrderId: string,
        @Body('razorpayPaymentId') razorpayPaymentId: string,
        @Body('razorpaySignature') razorpaySignature: string,
        @Body('amount') amount: number,
    ) {
        return this.cpService.verifyAndTopUp(
            req.user.id,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            Number(amount),
        );
    }

    @Get('me/transactions')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my transaction history' })
    getMyTransactions(@Request() req) {
        return this.cpService.getMyTransactions(req.user.id);
    }

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    @Get()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all Channel Partners (Admin)' })
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('status') status?: ChannelPartnerStatus
    ) {
        return this.cpService.findAll(page, limit, status);
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get Channel Partner details with referral bookings (Admin)' })
    findOne(@Param('id') id: string) {
        return this.cpService.adminGetPartnerDetails(id);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve/Reject/Update CP status (Admin)' })
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: ChannelPartnerStatus,
    ) {
        return this.cpService.updateStatus(id, status);
    }

    @Put(':id/commission-rate')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update CP commission rate (Admin)' })
    updateCommissionRate(
        @Param('id') id: string,
        @Body() data: UpdateCommissionRateDto,
    ) {
        return this.cpService.updateCommissionRate(id, data.commissionRate);
    }

    @Put(':id/referral-discount-rate')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update CP referral discount rate (Admin)' })
    updateReferralDiscountRate(
        @Param('id') id: string,
        @Body() data: UpdateReferralDiscountRateDto,
    ) {
        return this.cpService.updateReferralDiscountRate(id, data.referralDiscountRate);
    }

    @Get(':id/transactions')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get CP transaction history (Admin)' })
    adminGetTransactions(@Param('id') id: string) {
        return this.cpService.adminGetTransactions(id);
    }

    @Post(':id/adjust-wallet')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Adjust CP wallet balance (Admin)' })
    adjustWallet(
        @Param('id') id: string,
        @Body() data: { amount: number, description: string }
    ) {
        if (data.amount > 0) {
            return this.cpService.addWalletBalance(id, data.amount, data.description || 'Admin Adjustment');
        } else {
            return this.cpService.deductWalletBalance(id, Math.abs(data.amount), data.description || 'Admin Adjustment');
        }
    }

    // ============================================
    // REWARDS REDEMPTION
    // ============================================

    @Post('rewards/:rewardId/redeem')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Redeem a reward (Channel Partner)' })
    redeemReward(@Request() req, @Param('rewardId') rewardId: string) {
        return this.cpService.redeemReward(req.user.id, rewardId);
    }

    @Get('my/redemptions')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my reward redemptions' })
    getMyRedemptions(@Request() req) {
        return this.cpService.getMyRedemptions(req.user.id);
    }

    @Get('admin/redemptions')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all reward redemptions (Admin)' })
    findAllRedemptions(@Query('status') status?: RedemptionStatus) {
        return this.cpService.findAllRedemptions(status);
    }

    @Patch('redemptions/:id/status')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update redemption status (Admin)' })
    updateRedemptionStatus(
        @Param('id') id: string,
        @Body('status') status: RedemptionStatus,
        @Body('notes') notes?: string,
    ) {
        return this.cpService.updateRedemptionStatus(id, status, notes);
    }

    @Patch('me')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update my CP profile' })
    updateMyProfile(@Request() req, @Body() dto: UpdateCPProfileDto) {
        return this.cpService.updateMyProfile(req.user.id, dto);
    }
}


