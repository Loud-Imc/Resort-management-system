import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
    Request,
    Query
} from '@nestjs/common';
import { FinancialsService } from './financials.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdjustmentType, SettlementStatus, RedemptionStatus, RequestStatus } from '@prisma/client';

@ApiTags('Financials')
@Controller('financials')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class FinancialsController {
    constructor(private readonly financialsService: FinancialsService) { }

    // ============================================
    // AD-HOC ADJUSTMENTS (MAKER-CHECKER)
    // ============================================

    @Post('adjustments')
    @Permissions(PERMISSIONS.ADMIN.MANAGE_FINANCE)
    @ApiOperation({ summary: 'Create a wallet/points adjustment request (Maker)' })
    createAdjustment(@Request() req, @Body() dto: { targetId: string; amount: number; type: AdjustmentType; reason: string }) {
        return this.financialsService.createAdjustmentRequest(req.user, dto);
    }

    @Patch('adjustments/:id/approve')
    @Permissions(PERMISSIONS.FINANCE.APPROVE_ADJUSTMENT)
    @ApiOperation({ summary: 'Approve a financial adjustment request (Checker)' })
    approveAdjustment(@Request() req, @Param('id') id: string) {
        return this.financialsService.approveAdjustmentRequest(req.user, id);
    }

    // ============================================
    // PROPERTY GETTLEMENTS
    // ============================================

    @Post('settlements/calculate/:bookingId')
    @Permissions(PERMISSIONS.ADMIN.MANAGE_FINANCE)
    @ApiOperation({ summary: 'Calculate settlement for a checked-out booking (Maker)' })
    calculateSettlement(@Request() req, @Param('bookingId') bookingId: string) {
        return this.financialsService.calculateSettlement(req.user, bookingId);
    }

    @Patch('settlements/:id/approve')
    @Permissions(PERMISSIONS.FINANCE.APPROVE_SETTLEMENT)
    @ApiOperation({ summary: 'Approve calculated settlement (Checker)' })
    approveSettlement(@Request() req, @Param('id') id: string) {
        return this.financialsService.updateSettlementStatus(req.user, id, SettlementStatus.APPROVED);
    }

    @Patch('settlements/:id/payout')
    @Permissions(PERMISSIONS.FINANCE.PROCESS_PAYOUT)
    @ApiOperation({ summary: 'Mark settlement as PAID (Processor)' })
    processSettlementPayout(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: { referenceId: string; method: string }
    ) {
        return this.financialsService.updateSettlementStatus(req.user, id, SettlementStatus.PAID, dto);
    }

    // ============================================
    // CP REDEMPTIONS
    // ============================================

    @Post('redemptions')
    @Permissions(PERMISSIONS.ADMIN.MANAGE_FINANCE) // Admin initiating on behalf or from CP app
    @ApiOperation({ summary: 'Create a redemption request' })
    createRedemption(@Body() dto: { cpId: string; amount: number }) {
        return this.financialsService.createRedemptionRequest({ id: dto.cpId }, dto.amount);
    }

    @Patch('redemptions/:id/approve')
    @Permissions(PERMISSIONS.FINANCE.APPROVE_ADJUSTMENT)
    @ApiOperation({ summary: 'Approve redemption request (Checker)' })
    approveRedemption(@Request() req, @Param('id') id: string) {
        return this.financialsService.updateRedemptionStatus(req.user, id, RedemptionStatus.APPROVED);
    }

    @Patch('redemptions/:id/payout')
    @Permissions(PERMISSIONS.FINANCE.PROCESS_PAYOUT)
    @ApiOperation({ summary: 'Mark redemption as PAID (Processor)' })
    processRedemptionPayout(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: { referenceId: string; method: string }
    ) {
        return this.financialsService.updateRedemptionStatus(req.user, id, RedemptionStatus.PAID, dto);
    }

    // ============================================
    // RECONCILIATION
    // ============================================

    @Get('reconciliation/discrepancies')
    @Permissions(PERMISSIONS.FINANCE.RECONCILE_PAYMENT)
    @ApiOperation({ summary: 'List potential payment discrepancies (DB vs Gateway)' })
    getDiscrepancies() {
        return this.financialsService.checkDiscrepancies();
    }

    @Post('reconciliation/flag/:paymentId')
    @Permissions(PERMISSIONS.FINANCE.RECONCILE_PAYMENT)
    @ApiOperation({ summary: 'Flag a payment discrepancy (Maker)' })
    flagDiscrepancy(
        @Request() req,
        @Param('paymentId') paymentId: string,
        @Body() dto: { gatewayStatus: string }
    ) {
        return this.financialsService.flagDiscrepancy(req.user, paymentId, dto.gatewayStatus);
    }

    @Patch('reconciliation/resolve/:paymentId')
    @Permissions(PERMISSIONS.FINANCE.RECONCILE_PAYMENT)
    @ApiOperation({ summary: 'Resolve a flagged payment discrepancy (Checker)' })
    resolveDiscrepancy(
        @Request() req,
        @Param('paymentId') paymentId: string,
        @Body() dto: { notes: string }
    ) {
        return this.financialsService.resolveDiscrepancy(req.user, paymentId, dto.notes);
    }

    // ============================================
    // LISTING ENDPOINTS
    // ============================================

    @Get('settlements')
    @Permissions(PERMISSIONS.ADMIN.MANAGE_FINANCE)
    @ApiOperation({ summary: 'List all property settlements' })
    getAllSettlements(@Query('status') status?: SettlementStatus, @Query('propertyId') propertyId?: string) {
        return this.financialsService.getAllSettlements({ status, propertyId });
    }

    @Get('redemptions')
    @Permissions(PERMISSIONS.ADMIN.MANAGE_FINANCE)
    @ApiOperation({ summary: 'List all CP redemption requests' })
    getAllRedemptions(@Query('status') status?: RedemptionStatus, @Query('cpId') cpId?: string) {
        return this.financialsService.getAllRedemptions({ status, cpId });
    }

    @Get('adjustments')
    @Permissions(PERMISSIONS.ADMIN.MANAGE_FINANCE)
    @ApiOperation({ summary: 'List all financial adjustment requests' })
    getAllAdjustments(@Query('status') status?: RequestStatus, @Query('targetId') targetId?: string) {
        return this.financialsService.getAllAdjustments({ status, targetId });
    }
}
