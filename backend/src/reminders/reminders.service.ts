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
}
