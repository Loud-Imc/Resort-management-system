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
                    roomType: true,
                },
            });

            this.logger.log(`Found ${bookings.length} bookings for check-in tomorrow.`);

            for (const booking of bookings) {
                if (!booking.user?.id) continue;

                const title = 'Check-in Reminder 🏨';
                const message = `Friendly reminder: Your stay at ${booking.property?.name} starts tomorrow! We look forward to seeing you.`;

                // 1. Inbox + Push notification
                try {
                    await this.notificationsService.createNotification({
                        userId: booking.user.id,
                        title,
                        message,
                        type: 'CHECKIN_REMINDER',
                        targetRole: 'Customer',
                        data: { bookingId: booking.id, propertyId: booking.propertyId },
                    });
                } catch (err) {
                    this.logger.error(`[sendCheckInReminders] Inbox/Push failed for ${booking.bookingNumber}:`, err);
                }

                // 2. Email reminder
                try {
                    await this.notificationsService['mailService'].sendCheckInReminderEmail(booking);
                } catch (err) {
                    this.logger.error(`[sendCheckInReminders] Email failed for ${booking.bookingNumber}:`, err);
                }

                // 3. WhatsApp reminder
                const targetNumber = (booking as any).whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone;
                if (targetNumber) {
                    try {
                        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                        const msg = `🏨 *Check-in Reminder!*\n\nHi ${booking.user.firstName}, your stay at *${booking.property?.name}* starts tomorrow (${checkIn}).\n\nBooking #: ${booking.bookingNumber}\nCheck-in Time: 2:00 PM\n\nWe look forward to welcoming you! 🙏`;
                        await this.notificationsService.sendWhatsApp(targetNumber, msg);
                    } catch (err) {
                        this.logger.error(`[sendCheckInReminders] WhatsApp failed for ${booking.bookingNumber}:`, err);
                    }
                }

                this.logger.log(`Sent check-in reminder to user ${booking.user.id} for booking ${booking.bookingNumber}`);
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

    /**
     * Run every hour to check for bookings starting tomorrow with partial payments
     */
    @Cron(CronExpression.EVERY_HOUR)
    async processBalanceReminders() {
        this.logger.log('Checking for bookings requiring balance reminders...');

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
                    status: 'CONFIRMED',
                    paymentStatus: 'PARTIAL',
                    balanceReminderSentAt: null,
                },
                include: {
                    user: true,
                    property: true,
                },
            });

            this.logger.log(`Found ${bookings.length} partially paid bookings for balance reminders tomorrow.`);

            for (const booking of bookings) {
                await this.notificationsService.sendBalanceReminder(booking);
                this.logger.log(`Triggered balance reminder for booking ${booking.bookingNumber}`);
            }
        } catch (error) {
            this.logger.error('Failed to process balance reminders:', error);
        }
    }
}
