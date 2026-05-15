import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PromotionType, PromotionStatus } from '@prisma/client';
import { CreatePromotionRequestDto, PromotionQueryDto, VerifyPromotionPaymentDto } from './dto/promotion-request.dto';
import { addDays } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';

@Injectable()
export class PromotionsService {
  private razorpay: Razorpay;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  async submitRequest(propertyId: string, dto: CreatePromotionRequestDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start >= end) {
      throw new BadRequestException('End date must be after start date');
    }

    // 1. STRICT CAP: Enforce that one property can only have exactly ONE pending/active/waitlisted Home Featured campaign
    if (dto.type === PromotionType.HOMEPAGE_FEATURED) {
      const existingFeatured = await this.prisma.promotionRequest.findFirst({
        where: {
          propertyId,
          type: PromotionType.HOMEPAGE_FEATURED,
          status: {
            in: [
              PromotionStatus.PENDING_APPROVAL,
              PromotionStatus.WAITLISTED,
              PromotionStatus.PAYMENT_PENDING,
              PromotionStatus.ACTIVE,
            ],
          },
        },
      });
      if (existingFeatured) {
        throw new BadRequestException('This property already has a live, pending, or waitlisted Homepage Featured campaign. You can only run one active Featured slot at a time.');
      }
    }

    // Check for any active or pending request of this type that overlaps
    const overlapping = await this.prisma.promotionRequest.findFirst({
      where: {
        propertyId,
        type: dto.type,
        status: {
          in: [PromotionStatus.PENDING_APPROVAL, PromotionStatus.WAITLISTED, PromotionStatus.PAYMENT_PENDING, PromotionStatus.ACTIVE],
        },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('You already have a pending, waitlisted, or active promotion that overlaps with these dates.');
    }

    const request = await this.prisma.promotionRequest.create({
      data: {
        propertyId,
        type: dto.type,
        startDate: start,
        endDate: end,
        status: PromotionStatus.PENDING_APPROVAL,
      },
      include: { property: true },
    });

    // Notify admins of a new incoming offer to review
    await this.notifications.notifyAdmins({
      title: 'New Promotion Request 💰',
      message: `Property "${request.property.name}" requested a ${dto.type} campaign starting ${start.toLocaleDateString()}.`,
      type: 'PROMOTION_REQUESTED',
      data: { requestId: request.id },
    });

    return request;
  }

  async findAll(query: PromotionQueryDto) {
    const where: any = {};
    
    if (query.status) where.status = query.status as PromotionStatus;
    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.district) {
      // We map 'district' filtering to the 'city' field in the Property schema
      where.property = {
        city: { contains: query.district, mode: 'insensitive' },
      };
    }

    return this.prisma.promotionRequest.findMany({
      where,
      include: {
        property: {
          select: { id: true, name: true, city: true, state: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.promotionRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!request) throw new NotFoundException('Promotion request not found');
    return request;
  }

  /**
   * Evaluates availability for regional homepage Featured spots
   * Maps "district" concept directly to Property "city" data
   */
  async countActiveFeaturedInRegion(city: string) {
    const activeCount = await this.prisma.property.count({
      where: {
        city: { equals: city, mode: 'insensitive' },
        isFeatured: true,
      },
    });

    const pendingPaymentCount = await this.prisma.promotionRequest.count({
      where: {
        type: PromotionType.HOMEPAGE_FEATURED,
        status: PromotionStatus.PAYMENT_PENDING,
        property: {
          city: { equals: city, mode: 'insensitive' },
        },
      },
    });

    return activeCount + pendingPaymentCount;
  }

  async approveRequest(id: string, price: number) {
    const request = await this.findOne(id);

    if (request.status !== PromotionStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only requests in PENDING_APPROVAL status can be approved.');
    }

    let targetStatus: PromotionStatus = PromotionStatus.PAYMENT_PENDING;
    let paymentDeadline: Date | null = null;

    // If Homepage Featured, we must check the strict 3-slots-per-city rule
    if (request.type === PromotionType.HOMEPAGE_FEATURED) {
      const activeCount = await this.countActiveFeaturedInRegion(request.property.city);
      
      if (activeCount >= 3) {
        targetStatus = PromotionStatus.WAITLISTED;
      }
    }

    if (targetStatus === PromotionStatus.PAYMENT_PENDING) {
      paymentDeadline = addDays(new Date(), 1); // Gives 24-hour payment window
    }

    const updated = await this.prisma.promotionRequest.update({
      where: { id },
      data: {
        status: targetStatus,
        price,
        paymentDeadline,
      },
    });

    // Notify the owner
    if (targetStatus === PromotionStatus.PAYMENT_PENDING) {
      const propertyUrl = this.configService.get('PROPERTY_URL') || 'http://localhost:5175';
      const paymentLink = `${propertyUrl}/marketing/boosters`;

      await this.notifications.createNotification({
        userId: request.property.ownerId,
        title: 'Promotion Approved! 🚀',
        message: `Your promotion request has been approved. Price: ₹${price}. Click here to complete payment within 24 hours!`,
        type: 'PROMOTION_APPROVED',
        targetRole: 'PropertyOwner',
        data: { requestId: id, price, paymentLink },
      });

      // Send WhatsApp alert (if configured)
      const phone = request.property.whatsappNumber || request.property.phone;
      if (phone) {
        await this.notifications.sendWhatsApp(
          phone,
          `🚀 *Promotion Approved!*\n\nYour ${request.type} campaign for *${request.property.name}* is approved. Price: ₹${price}.\n\n💳 *Complete payment within 24h to lock in your spot:*\n${paymentLink}`,
        );
      }
    } else {
      // Waitlisted
      await this.notifications.createNotification({
        userId: request.property.ownerId,
        title: 'Added to Waitlist ⏳',
        message: `Your promotion request for ${request.property.city} has been approved but is currently on the Waitlist as the region is full. We will notify you as soon as a slot opens!`,
        type: 'PROMOTION_WAITLISTED',
        targetRole: 'PropertyOwner',
        data: { requestId: id },
      });
    }

    return updated;
  }

  async rejectRequest(id: string) {
    const request = await this.findOne(id);
    if (request.status !== PromotionStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Cannot reject request once approved/waitlisted.');
    }

    return this.prisma.promotionRequest.update({
      where: { id },
      data: { status: PromotionStatus.REJECTED },
    });
  }

  async initiatePayment(id: string) {
    const request = await this.prisma.promotionRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!request) {
      throw new NotFoundException('Promotion request not found');
    }

    if (request.status !== PromotionStatus.PAYMENT_PENDING) {
      throw new BadRequestException('Promotion is not in a payable status (must be approved first).');
    }

    const price = Number(request.price);
    if (price <= 0) {
      throw new BadRequestException('Promotion has zero quoted cost. Admin must set a valid price quote.');
    }

    try {
      const order = await this.razorpay.orders.create({
        amount: Math.round(price * 100), // Paisa conversion
        currency: 'INR',
        receipt: `PROMO-${request.id.substring(0, 8)}`,
        notes: {
          promotionRequestId: request.id,
          type: 'PROMOTION_PLACEMENT',
          propertyName: request.property.name,
        },
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
      };
    } catch (error: any) {
      console.error('[PromotionsService] Failed to create Razorpay Order:', error);
      throw new BadRequestException(error.description || 'Failed to create payment order with Razorpay.');
    }
  }

  async verifyPayment(id: string, dto: VerifyPromotionPaymentDto) {
    const body = dto.razorpayOrderId + '|' + dto.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.configService.get<string>('RAZORPAY_KEY_SECRET') || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Invalid payment verification signature.');
    }

    return this.handlePaymentCapture(id, dto.razorpayPaymentId);
  }

  async handlePaymentCapture(id: string, paymentId: string) {
    const request = await this.findOne(id);

    if (request.status !== PromotionStatus.PAYMENT_PENDING && request.status !== PromotionStatus.ACTIVE) {
      throw new BadRequestException('Invalid request status for payment processing.');
    }

    // Update Request
    const updatedRequest = await this.prisma.promotionRequest.update({
      where: { id },
      data: {
        status: PromotionStatus.ACTIVE,
        paymentId,
        paymentDeadline: null, // Clears deadline since paid
      },
    });

    // Log in global revenue analytics ledger
    await this.prisma.income.create({
      data: {
        amount: request.price,
        source: 'OTHER',
        description: `Promotional Placement (${request.type}) - Property: ${request.property.name}`,
        propertyId: request.propertyId,
      },
    });

    // Propagate active flags onto the parent Property
    const propUpdate: any = {
      promotionStart: request.startDate,
      promotionEnd: request.endDate,
    };

    if (request.type === PromotionType.HOMEPAGE_FEATURED) {
      propUpdate.isFeatured = true;
    } else {
      propUpdate.isSponsored = true;
    }

    await this.prisma.property.update({
      where: { id: request.propertyId },
      data: propUpdate,
    });

    await this.notifications.createNotification({
      userId: request.property.ownerId,
      title: 'Campaign Live! 🎉',
      message: `Thank you! Payment successful. Your ${request.type} campaign is now active on the platform.`,
      type: 'PROMOTION_ACTIVE',
      targetRole: 'PropertyOwner',
      data: { propertyId: request.propertyId },
    });

    return updatedRequest;
  }

  async getRegionalAvailability(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { city: true },
    });

    if (!property) throw new NotFoundException('Property not found');

    const activeCount = await this.countActiveFeaturedInRegion(property.city);
    
    return {
      city: property.city,
      activeCount,
      availableSlots: Math.max(0, 3 - activeCount),
      isFull: activeCount >= 3,
    };
  }
}
