import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountsService } from '../discounts/discounts.service';
import { CreateOfferDto } from '../discounts/dto/discounts.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('ota-portal/offers')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class OtaOffersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discountsService: DiscountsService,
  ) {}

  @Get()
  async getOffers(@Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    return this.discountsService.findAllOffers(req.user, headerPropertyId);
  }

  @Post()
  async createOffer(@Body() dto: CreateOfferDto, @Request() req) {
    return this.discountsService.createOffer(req.user, dto);
  }

  @Delete(':id')
  async deleteOffer(@Param('id') id: string, @Request() req) {
    return this.discountsService.removeOffer(id, req.user);
  }
}
