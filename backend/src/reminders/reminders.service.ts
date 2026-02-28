import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { addDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class RemindersService {
    private readonly logger = new Logger(RemindersService.name);

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }

    /**
     * Run every day at 10:00 AM to send reminders for bookings starting tomorrow
     */
    @Cron('0 10 * * *')
    async sendCheckInReminders() {
        this.logger.log('Running daily check-in reminders job...');

        const tomorrow = addDays(new Date(), 1);
        const startOfTomorrow = startOfDay(tomorrow);
        const endOfTomorrow = endOfDay(tomorrow);

        try {
            const bookings = await this.prisma.booking.findMany({
                where: {
                    checkInDate: {
                        gte: startOfTomorrow,
                        lte: endOfTomorrow,
                    },
                    status: 'CONFIRMED', // Only notify confirmed bookings
                },
                include: {
                    user: true,
                    property: true,
                },
            });

            this.logger.log(`Found ${bookings.length} bookings for check-in tomorrow.`);

            for (const booking of bookings) {
                if (!booking.user?.id) continue;

                const title = 'Check-in Reminder 🏨';
                const message = `Friendly reminder: Your stay at ${booking.property?.name} starts tomorrow! We look forward to seeing you.`;

                await this.notificationsService.createNotification({
                    userId: booking.user.id,
                    title,
                    message,
                    type: 'CHECKIN_REMINDER',
                    data: { bookingId: booking.id, propertyId: booking.propertyId },
                });

                // Also attempt push notification (already handled by createNotification inside NotificationsService)
                this.logger.log(`Sent reminder to user ${booking.user.id} for booking ${booking.bookingNumber}`);
            }
        } catch (error) {
            this.logger.error('Failed to process check-in reminders:', error);
        }
    }

    /**
     * Run every 30 minutes to remind users with pending payments (abandoned carts)
     */
    @Cron(CronExpression.EVERY_30_MINUTES)
    async processAbandonedCarts() {
        this.logger.log('Checking for abandoned carts...');
        
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        try {
            const pendingBookings = await this.prisma.booking.findMany({
                where: {
                    status: 'PENDING_PAYMENT',
                    createdAt: { lte: oneHourAgo },
                    abandonedCartSentAt: null, // Only send once
                },
                include: { property: true }
            });

            this.logger.log(`Found ${pendingBookings.length} abandoned carts to remind.`);

            for (const booking of pendingBookings) {
                await this.notificationsService.sendAbandonedCartReminder(booking);
                this.logger.log(`Sent abandoned cart reminder for booking ${booking.bookingNumber}`);
            }
        } catch (error) {
            this.logger.error('Failed to process abandoned carts:', error);
        }
    }

    /**
     * Run every hour to send review requests for bookings checked out > 2 hours ago
     */
    @Cron(CronExpression.EVERY_HOUR)
    async processReviewRequests() {
        this.logger.log('Checking for recent check-outs to request reviews...');

        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        try {
            const recentCheckOuts = await this.prisma.booking.findMany({
                where: {
                    status: 'CHECKED_OUT',
                    checkedOutAt: { lte: twoHoursAgo },
                    reviewRequestSentAt: null, // Only send once
                },
                include: { property: true }
            });

            this.logger.log(`Found ${recentCheckOuts.length} recent check-outs for review requests.`);

            for (const booking of recentCheckOuts) {
                await this.notificationsService.sendReviewRequest(booking);
                this.logger.log(`Sent review request for booking ${booking.bookingNumber}`);
            }
        } catch (error) {
            this.logger.error('Failed to process review requests:', error);
        }
    }
}
