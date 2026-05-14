import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PromotionStatus, PromotionType } from '@prisma/client';
import { addDays } from 'date-fns';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PromotionsCronService {
  private readonly logger = new Logger(PromotionsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Daily Midnight routine to clean expired listings, trigger new slots,
   * and evaluate renewal warning deadlines.
   * Runs daily at 00:00 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyMaintenance() {
    this.logger.log('🚀 Starting Daily Promotions Maintenance Cycle...');
    
    await this.expireCompletedCampaigns();
    await this.cancelExpiredPaymentOffers();
    await this.promoteWaitlistedItems();
    await this.sendRenewalWarnings();
    
    this.logger.log('🏁 Daily Maintenance Cycle Finished.');
  }

  /**
   * 1. Clean up active campaigns that passed their End Date
   */
  async expireCompletedCampaigns() {
    const now = new Date();
    const expiredRequests = await this.prisma.promotionRequest.findMany({
      where: {
        status: PromotionStatus.ACTIVE,
        endDate: { lt: now },
      },
      include: { property: true },
    });

    this.logger.log(`Found ${expiredRequests.length} completed campaigns to expire.`);

    for (const request of expiredRequests) {
      await this.prisma.promotionRequest.update({
        where: { id: request.id },
        data: { status: PromotionStatus.EXPIRED },
      });

      // Unset target booleans on parent Property record
      const propUpdate: any = {};
      if (request.type === PromotionType.HOMEPAGE_FEATURED) {
        propUpdate.isFeatured = false;
      } else {
        propUpdate.isSponsored = false;
      }

      await this.prisma.property.update({
        where: { id: request.propertyId },
        data: propUpdate,
      });

      this.logger.log(`Campaign ${request.id} for ${request.property.name} has EXPIRED.`);
    }
  }

  /**
   * 2. Clean up waitlist offers given 24h to pay that failed to transact
   */
  async cancelExpiredPaymentOffers() {
    const now = new Date();
    const deadlinePassed = await this.prisma.promotionRequest.findMany({
      where: {
        status: PromotionStatus.PAYMENT_PENDING,
        paymentDeadline: { lt: now },
      },
      include: { property: true },
    });

    this.logger.log(`Found ${deadlinePassed.length} unpaid offers exceeding 24-hour deadline.`);

    for (const request of deadlinePassed) {
      await this.prisma.promotionRequest.update({
        where: { id: request.id },
        data: {
          status: PromotionStatus.REJECTED, // Closes the request so next in line gets opportunity
          paymentDeadline: null,
        },
      });

      await this.notifications.createNotification({
        userId: request.property.ownerId,
        title: 'Offer Expired ❌',
        message: `Your exclusive 24-hour payment window for ${request.type} has expired. The slot has been released to the next property in line.`,
        type: 'PROMOTION_OFFER_EXPIRED',
        targetRole: 'PropertyOwner',
        data: { requestId: request.id },
      });

      this.logger.log(`Offer ${request.id} for ${request.property.name} cancelled due to non-payment.`);
    }
  }

  /**
   * 3. Promote waitlisted requests to Payment Pending when slots open up
   */
  async promoteWaitlistedItems() {
    this.logger.log('Checking for open slots to promote waitlist queue...');

    // Fetch all outstanding Waitlist requests, oldest first
    const queued = await this.prisma.promotionRequest.findMany({
      where: { status: PromotionStatus.WAITLISTED },
      include: { property: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const request of queued) {
      // For Featured items, check if regional slots are now available (< 3)
      if (request.type === PromotionType.HOMEPAGE_FEATURED) {
        const activeCount = await this.prisma.property.count({
          where: {
            city: { equals: request.property.city, mode: 'insensitive' },
            isFeatured: true,
          },
        });

        const pendingPaymentCount = await this.prisma.promotionRequest.count({
          where: {
            property: {
              city: { equals: request.property.city, mode: 'insensitive' },
            },
            type: PromotionType.HOMEPAGE_FEATURED,
            status: PromotionStatus.PAYMENT_PENDING,
          },
        });

        // Sum active + already locked in payment stage
        const lockedSlots = activeCount + pendingPaymentCount;

        if (lockedSlots < 3) {
          // Slot is available! Push to payment flow
          await this.prisma.promotionRequest.update({
            where: { id: request.id },
            data: {
              status: PromotionStatus.PAYMENT_PENDING,
              paymentDeadline: addDays(new Date(), 1), // Give 24-hour deadline
            },
          });

          const propertyUrl = this.configService.get('PROPERTY_URL') || 'http://localhost:5175';
          const paymentLink = `${propertyUrl}/marketing/boosters`;

          await this.notifications.createNotification({
            userId: request.property.ownerId,
            title: 'Featured Slot Available! 🚀',
            message: `A Featured Slot in ${request.property.city} is now open for you! Complete payment within 24 hours to activate.`,
            type: 'PROMOTION_APPROVED',
            targetRole: 'PropertyOwner',
            data: { requestId: request.id, price: Number(request.price), paymentLink },
          });

          const phone = request.property.whatsappNumber || request.property.phone;
          if (phone) {
            await this.notifications.sendWhatsApp(
              phone,
              `🚀 *Exclusive Offer!*\n\nA Featured homepage slot in *${request.property.city}* has opened up. Complete payment within 24h to secure your spot!\n\nPrice: ₹${request.price}\n\n💳 *Complete Payment Here:*\n${paymentLink}`,
            );
          }

          this.logger.log(`Promoted Waitlist request ${request.id} to Payment Pending.`);
        }
      } else {
        // Sponsored has no limit, so we immediately release them to payment pending if they were waitlisted
        await this.prisma.promotionRequest.update({
          where: { id: request.id },
          data: {
            status: PromotionStatus.PAYMENT_PENDING,
            paymentDeadline: addDays(new Date(), 1),
          },
        });
      }
    }
  }

  /**
   * 4. Send 24-hour warning alerts for continuity ("Right of First Refusal")
   */
  async sendRenewalWarnings() {
    const tomorrow = addDays(new Date(), 1);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    // Find active campaigns expiring tomorrow
    const expiringSoon = await this.prisma.promotionRequest.findMany({
      where: {
        status: PromotionStatus.ACTIVE,
        endDate: {
          gte: tomorrow,
          lte: endOfTomorrow,
        },
      },
      include: { property: true },
    });

    this.logger.log(`Found ${expiringSoon.length} campaigns expiring in 24 hours. Sending warnings.`);

    for (const request of expiringSoon) {
      const propertyUrl = this.configService.get('PROPERTY_URL') || 'http://localhost:5175';
      const paymentLink = `${propertyUrl}/marketing/boosters`;

      await this.notifications.createNotification({
        userId: request.property.ownerId,
        title: 'Campaign Expiring in 24h ⚠️',
        message: `Your ${request.type} promotion expires tomorrow. Renew now to prevent losing your slot to the waitlist queue!`,
        type: 'PROMOTION_EXPIRING_ALERT',
        targetRole: 'PropertyOwner',
        data: { requestId: request.id, paymentLink },
      });

      const phone = request.property.whatsappNumber || request.property.phone;
      if (phone) {
        await this.notifications.sendWhatsApp(
          phone,
          `⚠️ *Campaign Expiring Soon!*\n\nYour promotion for *${request.property.name}* will expire in 24 hours.\n\nTo keep your exclusive spot and prevent it from passing to the queue, renew now!\n\n💳 *Renew instantly at:*\n${paymentLink}`,
        );
      }

      this.logger.log(`Sent renewal warning to ${request.property.name} for request ${request.id}.`);
    }
  }
}
