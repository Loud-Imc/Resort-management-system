import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { Twilio } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationsService {
  private twilioClient: Twilio;
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App;

  constructor(
    private configService: ConfigService,
    private gateway: NotificationsGateway,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.twilioClient = new Twilio(accountSid, authToken);
    }

    // Initialize Firebase Admin
    if (admin.apps.length > 0) {
      this.firebaseApp = admin.apps[0]!;
      this.logger.log('Firebase Admin already initialized. Using existing instance.');
      return;
    }

    const firebaseConfig = this.configService.get('FIREBASE_SERVICE_ACCOUNT');
    const projectId = this.configService.get('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY');

    if (firebaseConfig) {
      try {
        const serviceAccount = JSON.parse(firebaseConfig);
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('Firebase Admin initialized successfully using service account JSON');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin from JSON:', error);
      }
    } else if (projectId && clientEmail && privateKey) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        this.logger.log('Firebase Admin initialized successfully using individual env vars');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin from individual vars:', error);
      }
    } else {
      this.logger.warn('Firebase configuration (FIREBASE_SERVICE_ACCOUNT or individual vars) not found. Push notifications disabled.');
    }
  }

  /**
   * Save a notification to the database and broadcast it
   */
  async createNotification(payload: {
    userId: string;
    title: string;
    message: string;
    type: string;
    data?: any;
  }) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          data: payload.data || {},
        },
      });

      // Also broadcast via websocket if user is online
      this.gateway.sendToRoom(`user_${payload.userId}`, 'NEW_NOTIFICATION', notification);

      // Trigger Push Notification (FCM)
      this.sendPushNotification(payload.userId, payload.title, payload.message, payload.data);

      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification for user ${payload.userId}:`, error);
    }
  }

  /**
   * Send a Real-time notification to Dashboards
   */
  async notifyDashboard(event: string, data: any, propertyId?: string) {
    this.logger.log(`Broadcasting dashboard event: ${event}`);

    // Send to global admins
    this.gateway.sendToRoom('admins', event, data);

    // Send to specific property owners/staff if propertyId provided
    if (propertyId) {
      this.gateway.sendToRoom(`property_${propertyId}`, event, data);
    } else {
      // Fallback to all if no specific target (e.g., system wide)
      this.gateway.sendToAll(event, data);
    }
  }

  /**
   * Send WhatsApp Message
   */
  async sendWhatsApp(to: string, message: string) {
    const from = this.configService.get('TWILIO_WHATSAPP_NUMBER'); // e.g., 'whatsapp:+14155238886'

    if (!this.twilioClient) {
      this.logger.warn(`Twilio not configured. Simulating WhatsApp to ${to}: ${message}`);
      return;
    }

    try {
      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      await this.twilioClient.messages.create({
        body: message,
        from: from,
        to: formattedTo,
      });
      this.logger.log(`WhatsApp sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp to ${to}:`, error);
    }
  }

  /**
   * Convenience method for New Booking Alert
   */
  async broadcastNewBooking(booking: any) {
    const isCPBooked = !!booking.channelPartnerId;
    const summary = `New Booking: ${booking.bookingNumber} at ${booking.property?.name}`;
    
    // 1. WebSocket alert for dashboard toasts (Notify Property Dashboard)
    await this.notifyDashboard('NEW_BOOKING', booking, booking.propertyId);

    // 2. Email & Persistent Notifications for Property Owner (ALWAYS)
    if (booking.property?.ownerId) {
      // Socket & DB Notification
      await this.createNotification({
        userId: booking.property.ownerId,
        title: 'New Booking Received 🚀',
        message: summary,
        type: 'BOOKING_CREATED',
        data: { bookingId: booking.id, propertyId: booking.propertyId }
      });
      
      // Premium Email to Property
      if (booking.property?.propertyEmail || booking.property?.owner?.email) {
        const targetEmail = booking.property.propertyEmail || booking.property.owner.email;
        await this.mailService.sendPropertyNewBookingAlert(targetEmail, booking);
      }
    }

    // 3. Notification for Guest (Only if NOT booked by CP, or if guest details provided)
    // The user mentioned: "if the booking is booked by the CP, then only need to notify the property and CP"
    if (!isCPBooked && booking.userId) {
      // Socket & DB Notification
      await this.createNotification({
        userId: booking.userId,
        title: 'Booking Confirmed! 🏨',
        message: `Your stay at ${booking.property?.name} is confirmed. Booking #: ${booking.bookingNumber}`,
        type: 'BOOKING_CONFIRMED',
        data: { bookingId: booking.id, propertyId: booking.propertyId }
      });

      // Premium Email to Guest
      await this.mailService.sendBookingConfirmation(booking);

      // WhatsApp alert for Guest
      if (booking.whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone) {
        const whatsappMsg = `🚀 *New Booking Alert*!\n\n` +
          `Booking #: ${booking.bookingNumber}\n` +
          `Resort: ${booking.property?.name}\n` +
          `Guest: ${booking.user?.firstName} ${booking.user?.lastName}\n` +
          `Total: ₹${booking.totalAmount}\n` +
          `Check-in: ${new Date(booking.checkInDate).toLocaleDateString()}`;
        const targetNumber = booking.whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone;
        await this.sendWhatsApp(targetNumber, whatsappMsg);
      }
    }

    // 4. Notification for Channel Partner (if applicable)
    if (isCPBooked && booking.channelPartner?.userId) {
      await this.createNotification({
        userId: booking.channelPartner.userId,
        title: 'New Referral Booking! 💰',
        message: `A booking was made using your referral code at ${booking.property?.name}`,
        type: 'CP_REFERRAL_BOOKING',
        data: { bookingId: booking.id, commission: booking.cpCommission }
      });

      // Optional: WhatsApp for CP (if number exists)
      if (booking.channelPartner?.user?.phone) {
        const cpMsg = `💰 *New Referral Booking!*\n\n` +
          `Booking #: ${booking.bookingNumber}\n` +
          `Property: ${booking.property?.name}\n` +
          `Commission earned: ₹${booking.cpCommission}`;
        await this.sendWhatsApp(booking.channelPartner.user.phone, cpMsg);
      }
    }
  }

  /**
   * Helper to notify all SuperAdmins and Admins
   */
  async notifyAdmins(payload: { title: string; message: string; type: string; data?: any }) {
    const admins = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: { in: ['SuperAdmin', 'Admin'] }
            }
          }
        }
      }
    });

    for (const admin of admins) {
      await this.createNotification({
        userId: admin.id,
        ...payload
      });
    }

    // Also broadcast to the 'admins' room
    this.gateway.sendToRoom('admins', payload.type, payload.data);
  }

  /**
   * Notify admins when a new property registers
   */
  async notifyPropertyRegistration(property: any) {
    await this.notifyAdmins({
      title: 'New Property Registered 🏨',
      message: `A new property "${property.name}" is pending approval.`,
      type: 'PROPERTY_REGISTRATION',
      data: { propertyId: property.id }
    });
  }

  /**
   * Notify admins when a new Channel Partner registers
   */
  async notifyCPRegistration(cp: any) {
    await this.notifyAdmins({
      title: 'New Channel Partner Signup 🤝',
      message: `${cp.user?.firstName} ${cp.user?.lastName} registered as a partner.`,
      type: 'CP_REGISTRATION',
      data: { cpId: cp.id }
    });
  }

  /**
   * Notify property owner when property is Approved/Rejected
   */
  async notifyPropertyStatusUpdate(property: any, status: string) {
    const isApproved = status === 'APPROVED';
    await this.createNotification({
      userId: property.ownerId,
      title: isApproved ? 'Property Approved! 🎉' : 'Property Update',
      message: isApproved
        ? `Your property "${property.name}" has been approved and is now live.`
        : `There is an update regarding your property "${property.name}".`,
      type: 'PROPERTY_STATUS_UPDATE',
      data: { propertyId: property.id, status }
    });
  }

  /**
   * Complex Broadcast: Target by IDs, Roles, or Property
   */
  async broadcastNotification(payload: {
    title: string;
    message: string;
    type: string;
    targetUsers?: string[];
    targetRoles?: string[];
    propertyId?: string;
    data?: any;
  }) {
    let userIds: string[] = [];

    if (payload.targetUsers?.length) {
      userIds = payload.targetUsers;
    } else if (payload.targetRoles?.length) {
      const users = await this.prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                name: { in: payload.targetRoles }
              }
            }
          }
        },
        select: { id: true }
      });
      userIds = users.map(u => u.id);
    } else if (payload.propertyId) {
      // Find all guests who have booked THIS property
      const bookings = await this.prisma.booking.findMany({
        where: { propertyId: payload.propertyId },
        select: { userId: true },
        distinct: ['userId']
      });
      userIds = bookings.map(b => b.userId);
    } else {
      // Broadcast to ALL users
      const users = await this.prisma.user.findMany({ select: { id: true } });
      userIds = users.map(u => u.id);
    }

    this.logger.log(`Broadcasting "${payload.title}" to ${userIds.length} users`);

    // Create notifications in chunks to avoid overloading
    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += 100) {
      chunks.push(userIds.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(uid => this.createNotification({
        userId: uid,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        data: payload.data
      })));
    }

    return { success: true, count: userIds.length };
  }

  /**
   * Notify guest of Check-in
   */
  async notifyCheckIn(booking: any) {
    if (booking.userId) {
      await this.createNotification({
        userId: booking.userId,
        title: 'Welcome! 🏨',
        message: `You have successfully checked in at ${booking.property?.name}. Enjoy your stay!`,
        type: 'CHECKIN_SUCCESS',
        data: { bookingId: booking.id, propertyId: booking.propertyId }
      });
    }
  }

  /**
   * Notify guest of Check-out
   */
  async notifyCheckOut(booking: any) {
    if (booking.userId) {
      await this.createNotification({
        userId: booking.userId,
        title: 'Thank You! 😊',
        message: `Thank you for staying at ${booking.property?.name}. We hope to see you again soon!`,
        type: 'CHECKOUT_SUCCESS',
        data: { bookingId: booking.id, propertyId: booking.propertyId }
      });
    }
  }

  /**
   * Notify guest of Cancellation
   */
  async notifyCancellation(booking: any) {
    if (booking.userId) {
      await this.createNotification({
        userId: booking.userId,
        title: 'Booking Cancelled 🚫',
        message: `Your booking ${booking.bookingNumber} at ${booking.property?.name} has been cancelled.`,
        type: 'BOOKING_CANCELLED',
        data: { bookingId: booking.id, propertyId: booking.propertyId }
      });
    }
  }

  /**
   * Notify owner when a payout is confirmed
   */
  async notifyPayoutConfirmed(payment: any) {
    const userId = payment.booking?.property?.ownerId || payment.eventBooking?.event?.property?.ownerId;
    if (userId) {
      await this.createNotification({
        userId,
        title: 'Payout Confirmed 💸',
        message: `Payout for booking ${payment.booking?.bookingNumber || payment.eventBooking?.ticketId} has been processed.`,
        type: 'PAYOUT_CONFIRMED',
        data: { paymentId: payment.id, amount: payment.netAmount }
      });
    }
  }

  /**
   * Send Abandoned Cart Reminder
   */
  async sendAbandonedCartReminder(booking: any) {
    if (booking.userId) {
      await this.createNotification({
        userId: booking.userId,
        title: 'Complete Your Booking! ✨',
        message: `Your stay at ${booking.property?.name} is waiting. Complete your payment to secure your room.`,
        type: 'ABANDONED_CART',
        data: { bookingId: booking.id, propertyId: booking.propertyId }
      });

      // Update booking to track reminder sent
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { abandonedCartSentAt: new Date() }
      });
    }
  }

  /**
   * Send Review Request
   */
  async sendReviewRequest(booking: any) {
    if (booking.userId) {
      await this.createNotification({
        userId: booking.userId,
        title: 'How was your stay? ⭐',
        message: `We hope you enjoyed your stay at ${booking.property?.name}. Please leave us a review!`,
        type: 'REVIEW_REQUEST',
        data: { bookingId: booking.id, propertyId: booking.propertyId }
      });

      // Update booking to track reminder sent
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { reviewRequestSentAt: new Date() }
      });
    }
  }

  /**
   * Send Push Notification via FCM
   */
  async sendPushNotification(userId: string, title: string, body: string, data?: any) {
    if (!this.firebaseApp) {
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true }
      });

      if (user?.fcmToken) {
        const message = {
          notification: { title, body },
          token: user.fcmToken,
          data: data ? Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ) : {},
        };

        await this.firebaseApp.messaging().send(message);
        this.logger.log(`Push notification sent to user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${userId}:`, error);
    }
  }
}
