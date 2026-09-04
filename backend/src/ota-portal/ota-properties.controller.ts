import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { CancellationPoliciesService } from '../cancellation-policies/cancellation-policies.service';
import { CreateCancellationPolicyDto } from '../cancellation-policies/dto/cancellation-policy.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('ota-portal/properties')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class OtaPropertiesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertiesService: PropertiesService,
    private readonly policiesService: CancellationPoliciesService,
  ) {}

  @Get('my')
  async getMyProperty(@Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) {
      throw new NotFoundException('No property listing registered for your account.');
    }
    return property;
  }

  @Put('my')
  async updateMyProperty(@Body() dto: any, @Request() req) {
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

    // Sanitize and update only OTA listing fields
    const updated = await this.prisma.property.update({
      where: { id: property.id },
      data: {
        name: dto.name,
        description: dto.description,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        phone: dto.phone,
        email: dto.email,
        whatsappNumber: dto.whatsappNumber,
        latitude: dto.latitude ? parseFloat(dto.latitude) : null,
        longitude: dto.longitude ? parseFloat(dto.longitude) : null,
        coverImage: dto.coverImage,
        images: dto.images,
        amenities: dto.amenities,
        isGstApplicable: dto.isGstApplicable !== undefined ? Boolean(dto.isGstApplicable) : undefined,
        gstNumber: dto.gstNumber !== undefined ? (dto.gstNumber ? dto.gstNumber.trim().toUpperCase() : null) : undefined,
      },
    });

    return updated;
  }

  @Get('my/policies')
  async getMyPolicies(@Request() req) {
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
    return this.policiesService.findAll(property.id);
  }

  @Post('my/policies')
  async createMyPolicy(@Body() dto: CreateCancellationPolicyDto, @Request() req) {
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
    dto.propertyId = property.id;
    return this.policiesService.create(dto, req.user);
  }

  @Delete('my/policies/:id')
  async deleteMyPolicy(@Param('id') id: string, @Request() req) {
    const policy = await this.prisma.cancellationPolicy.findUnique({
      where: { id },
    });
    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });

    if (!property || policy.propertyId !== property.id) {
      throw new ForbiddenException('You do not own this property');
    }

    return this.policiesService.remove(id);
  }
}
