import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DiscountsService } from './discounts.service';
import { CreateCouponDto, UpdateCouponDto, CreateOfferDto, UpdateOfferDto } from './dto/discounts.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Discounts & Marketing')
@Controller('discounts')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class DiscountsController {
    constructor(private readonly discountsService: DiscountsService) { }

    // ============================================
    // COUPON ENDPOINTS (Admin Only)
    // ============================================

    @Post('coupons')
    @Permissions(PERMISSIONS.MARKETING.MANAGE_COUPONS)
    @ApiOperation({ summary: 'Create a new global coupon (Admin)' })
    createCoupon(@Body() dto: CreateCouponDto) {
        return this.discountsService.createCoupon(dto);
    }

    @Get('coupons')
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiOperation({ summary: 'List all active coupons' })
    findAllCoupons() {
        return this.discountsService.findAllCoupons();
    }

    @Get('coupons/:id')
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiOperation({ summary: 'Get coupon by ID' })
    findOneCoupon(@Param('id') id: string) {
        return this.discountsService.findOneCoupon(id);
    }

    @Put('coupons/:id')
    @Permissions(PERMISSIONS.MARKETING.MANAGE_COUPONS)
    @ApiOperation({ summary: 'Update a coupon (Admin)' })
    updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
        return this.discountsService.updateCoupon(id, dto);
    }

    @Delete('coupons/:id')
    @Permissions(PERMISSIONS.MARKETING.MANAGE_COUPONS)
    @ApiOperation({ summary: 'Delete a coupon (Admin)' })
    removeCoupon(@Param('id') id: string) {
        return this.discountsService.removeCoupon(id);
    }

    // ============================================
    // OFFER ENDPOINTS (Owner/Admin)
    // ============================================

    @Post('offers')
    @Permissions(PERMISSIONS.MARKETING.MANAGE_OFFERS)
    @ApiOperation({ summary: 'Create a new room offer (Owner/Admin)' })
    createOffer(@Request() req, @Body() dto: CreateOfferDto) {
        return this.discountsService.createOffer(req.user, dto);
    }

    @Get('offers')
    @Permissions(PERMISSIONS.MARKETING.MANAGE_OFFERS)
    @ApiOperation({ summary: 'List all offers accessible to user' })
    findAllOffers(@Request() req) {
        return this.discountsService.findAllOffers(req.user);
    }

    @Get('offers/:id')
    @Permissions(PERMISSIONS.MARKETING.MANAGE_OFFERS)
    @ApiOperation({ summary: 'Get offer by ID' })
    findOneOffer(@Param('id') id: string, @Request() req) {
        return this.discountsService.findOneOffer(id, req.user);
    }

    @Put('offers/:id')
    @Permissions(PERMISSIONS.MARKETING.MANAGE_OFFERS)
    @ApiOperation({ summary: 'Update an offer (Owner/Admin)' })
    updateOffer(@Param('id') id: string, @Request() req, @Body() dto: UpdateOfferDto) {
        return this.discountsService.updateOffer(id, req.user, dto);
    }

    @Delete('offers/:id')
    @Permissions(PERMISSIONS.MARKETING.MANAGE_OFFERS)
    @ApiOperation({ summary: 'Delete an offer (Owner/Admin)' })
    removeOffer(@Param('id') id: string, @Request() req) {
        return this.discountsService.removeOffer(id, req.user);
    }
}
