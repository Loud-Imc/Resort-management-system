import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreatePromotionRequestDto, VerifyPromotionPaymentDto } from '../promotions/dto/promotion-request.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('ota-portal/promotions')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class OtaPromotionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionsService: PromotionsService,
  ) {}

  @Get()
  async getPromotions(@Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) return [];

    return this.promotionsService.findAll({ propertyId: property.id });
  }

  @Get('availability')
  async getAvailability(@Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return this.promotionsService.getRegionalAvailability(property.id);
  }

  @Post()
  async requestPromotion(@Body() dto: CreatePromotionRequestDto, @Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return this.promotionsService.submitRequest(property.id, dto);
  }

  @Post(':id/initiate-payment')
  async initiatePayment(@Param('id') id: string, @Request() req) {
    const promotion = await this.prisma.promotionRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion request not found');
    }

    if (promotion.property.ownerId !== req.user.id) {
      throw new ForbiddenException('You do not own this property');
    }

    return this.promotionsService.initiatePayment(id);
  }

  @Post(':id/verify-payment')
  async verifyPayment(
    @Param('id') id: string,
    @Body() dto: VerifyPromotionPaymentDto,
    @Request() req,
  ) {
    const promotion = await this.prisma.promotionRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion request not found');
    }

    if (promotion.property.ownerId !== req.user.id) {
      throw new ForbiddenException('You do not own this property');
    }

    return this.promotionsService.verifyPayment(id, dto);
  }
}
