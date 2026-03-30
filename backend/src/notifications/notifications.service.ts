import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { Twilio } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';
import { MailService } from '../mail/mail.service';
import { PdfService } from '../pdf/pdf.service';

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
    private pdfService: PdfService,
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
    targetRole?: string;
    data?: any;
  }) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          targetRole: payload.targetRole,
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
   * Idempotent: checks for an existing BOOKING_CONFIRMED notification before sending
   * to prevent duplicates triggered by both verifyPayment and handlePaymentCaptured.
   */
  async broadcastNewBooking(booking: any) {
    const isCPBooked = !!booking.channelPartnerId;
    const summary = `New Booking: ${booking.bookingNumber} at ${booking.property?.name}`;

    // --- IDEMPOTENCY GUARD ---
    // Prevent duplicate broadcast if both verifyPayment and handlePaymentCaptured fire.
    if (booking.userId) {
      const alreadyNotified = await this.prisma.notification.findFirst({
        where: {
          userId: booking.userId,
          type: 'BOOKING_CONFIRMED',
          data: { path: ['bookingId'], equals: booking.id },
        },
      });
      if (alreadyNotified) {
        this.logger.warn(`Duplicate broadcastNewBooking suppressed for booking ${booking.bookingNumber}`);
        return;
      }
    }

    // 1. WebSocket alert for dashboard toasts (Notify Property Dashboard)
    try {
      await this.notifyDashboard('NEW_BOOKING', booking, booking.propertyId);
    } catch (err) {
      this.logger.error(`[broadcastNewBooking] Dashboard notify failed for ${booking.bookingNumber}:`, err);
    }

    // 0. Pre-generate the PDF once to be shared across emails
    let pdfAttachment: { filename: string; content: Buffer } | undefined;
    try {
      const pdfBuffer = await this.pdfService.generateBookingConfirmation(booking);
      pdfAttachment = {
        filename: `Reservation_${booking.bookingNumber}.pdf`,
        content: pdfBuffer,
      };
    } catch (err) {
      this.logger.error(`[broadcastNewBooking] PDF generation failed for ${booking.bookingNumber}:`, err);
    }

    // 2. Email & Persistent Notifications for Property Owner (ALWAYS)
    if (booking.property?.ownerId) {
      // Socket & DB Notification
      try {
        await this.createNotification({
          userId: booking.property.ownerId,
          title: 'New Booking Received 🚀',
          message: summary,
          type: 'BOOKING_CREATED',
          targetRole: 'PropertyOwner',
          data: { bookingId: booking.id, propertyId: booking.propertyId }
        });
      } catch (err) {
        this.logger.error(`[broadcastNewBooking] Owner inbox notification failed:`, err);
      }

      // Premium Email to Property & Owner
      const propertyEmail = booking.property?.email;
      const ownerEmail = booking.property?.owner?.email;

      if (propertyEmail && pdfAttachment) {
        try {
          await this.mailService.sendPropertyNewBookingAlert(propertyEmail, booking, pdfAttachment);
        } catch (err) {
          this.logger.error(`[broadcastNewBooking] Property email failed to ${propertyEmail}:`, err);
        }
      }
      if (ownerEmail && ownerEmail !== propertyEmail && pdfAttachment) {
        try {
          await this.mailService.sendPropertyNewBookingAlert(ownerEmail, booking, pdfAttachment);
        } catch (err) {
          this.logger.error(`[broadcastNewBooking] Owner email failed to ${ownerEmail}:`, err);
        }
      }

      // WhatsApp alert for Property
      const propertyPhone = booking.property?.whatsappNumber || booking.property?.phone;
      if (propertyPhone) {
        try {
          const whatsappMsg = `🏨 *New Booking Received*!\n\n` +
            `Booking #: ${booking.bookingNumber}\n` +
            `Guest: ${booking.user?.firstName} ${booking.user?.lastName}\n` +
            `Total: ₹${booking.totalAmount}\n` +
            `Check-in: ${new Date(booking.checkInDate).toLocaleDateString()}`;
          await this.sendWhatsApp(propertyPhone, whatsappMsg);
        } catch (err) {
          this.logger.error(`[broadcastNewBooking] Property WhatsApp failed to ${propertyPhone}:`, err);
        }
      }
    }

    // 3. Notification for Guest
    if (booking.userId) {
      // Socket & DB Notification
      try {
        await this.createNotification({
          userId: booking.userId,
          title: 'Booking Confirmed! 🏨',
          message: `Your stay at ${booking.property?.name} is confirmed. Booking #: ${booking.bookingNumber}`,
          type: 'BOOKING_CONFIRMED',
          targetRole: 'Customer',
          data: { bookingId: booking.id, propertyId: booking.propertyId }
        });
      } catch (err) {
        this.logger.error(`[broadcastNewBooking] Guest inbox notification failed:`, err);
      }

      // Premium Email to Guest with PDF Attachment
      if (pdfAttachment) {
        try {
          await this.mailService.sendBookingConfirmation(booking, pdfAttachment);
        } catch (err) {
          this.logger.error(`[broadcastNewBooking] Guest confirmation email failed:`, err);
        }
      }

      // WhatsApp alert for Guest
      const targetNumber = booking.whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone;
      if (targetNumber) {
        try {
          const whatsappMsg = `🚀 *New Booking Alert*!\n\n` +
            `Booking #: ${booking.bookingNumber}\n` +
            `Resort: ${booking.property?.name}\n` +
            `Guest: ${booking.user?.firstName} ${booking.user?.lastName}\n` +
            `Total: ₹${booking.totalAmount}\n` +
            `Check-in: ${new Date(booking.checkInDate).toLocaleDateString()}`;
          await this.sendWhatsApp(targetNumber, whatsappMsg);
        } catch (err) {
          this.logger.error(`[broadcastNewBooking] Guest WhatsApp failed to ${targetNumber}:`, err);
        }
      }
    }

    // 4. Notification for Channel Partner (if applicable)
    if (isCPBooked && booking.channelPartner?.userId) {
      // Socket & DB Notification
      try {
        await this.createNotification({
          userId: booking.channelPartner.userId,
          title: 'New Referral Booking! 💰',
          message: `A booking was made using your referral code at ${booking.property?.name}`,
          type: 'CP_REFERRAL_BOOKING',
          targetRole: 'ChannelPartner',
          data: { bookingId: booking.id, commission: booking.cpCommission }
        });
      } catch (err) {
        this.logger.error(`[broadcastNewBooking] CP inbox notification failed:`, err);
      }

      // Premium Email to CP
      if (booking.channelPartner?.user?.email && pdfAttachment) {
        try {
          await this.mailService.sendChannelPartnerBookingAlert(booking.channelPartner.user.email, booking, pdfAttachment);
        } catch (err) {
          this.logger.error(`[broadcastNewBooking] CP email failed:`, err);
        }
      }

      // Optional: WhatsApp for CP (if number exists)
      if (booking.channelPartner?.user?.phone) {
        try {
          const cpMsg = `💰 *New Referral Booking!*\n\n` +
            `Booking #: ${booking.bookingNumber}\n` +
            `Property: ${booking.property?.name}\n` +
            `Commission earned: ₹${booking.cpCommission}`;
          await this.sendWhatsApp(booking.channelPartner.user.phone, cpMsg);
        } catch (err) {
          this.logger.error(`[broadcastNewBooking] CP WhatsApp failed:`, err);
        }
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
   * Notify admins when a new property onboarding request is initiated
   */
  async notifyPropertyRequest(request: any) {
    await this.notifyAdmins({
      title: 'New Property Onboarding Request 🏨',
      message: `A marketing-led request for "${request.name}" is pending review.`,
      type: 'PROPERTY_REQUEST',
      data: { requestId: request.id }
    });
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
      targetRole: 'PropertyOwner',
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
        targetRole: 'Customer',
        data: { bookingId: booking.id, propertyId: booking.propertyId }
      });

      // WhatsApp alert for Check-in
      if (booking.whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone) {
        const msg = `Welcome! 🏨\n\nYou have successfully checked in at *${booking.property?.name}*. Enjoy your stay!`;
        const targetNumber = booking.whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone;
        await this.sendWhatsApp(targetNumber, msg);
      }
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
        targetRole: 'Customer',
        data: { bookingId: booking.id, propertyId: booking.propertyId }
      });

      // WhatsApp alert for Check-out
      if (booking.whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone) {
        const msg = `Thank You! 😊\n\nThank you for staying at *${booking.property?.name}*. We hope to see you again soon!`;
        const targetNumber = booking.whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone;
        await this.sendWhatsApp(targetNumber, msg);
      }
    }
  }

  /**
   * Notify guest of Cancellation — Inbox + WhatsApp + Email
   */
  async notifyCancellation(booking: any) {
    if (booking.userId) {
      try {
        await this.createNotification({
          userId: booking.userId,
          title: 'Booking Cancelled 🚫',
          message: `Your booking ${booking.bookingNumber} at ${booking.property?.name} has been cancelled.`,
          type: 'BOOKING_CANCELLED',
          targetRole: 'Customer',
          data: { bookingId: booking.id, propertyId: booking.propertyId }
        });
      } catch (err) {
        this.logger.error(`[notifyCancellation] Inbox notification failed:`, err);
      }

      // Email confirmation with refund status
      try {
        await this.mailService.sendCancellationConfirmation(booking);
      } catch (err) {
        this.logger.error(`[notifyCancellation] Email failed:`, err);
      }

      // WhatsApp alert for Cancellation
      const targetNumber = booking.whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone;
      if (targetNumber) {
        try {
          const refundAmount = Number(booking.refundAmount || 0);
          const refundLine = refundAmount > 0 ? `\nRefund of ₹${refundAmount.toLocaleString('en-IN')} will be processed within 5–7 business days.` : '';
          const msg = `Booking Cancelled 🚫\n\nYour booking *${booking.bookingNumber}* at *${booking.property?.name}* has been cancelled.${refundLine}`;
          await this.sendWhatsApp(targetNumber, msg);
        } catch (err) {
          this.logger.error(`[notifyCancellation] WhatsApp failed:`, err);
        }
      }
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
        targetRole: 'PropertyOwner',
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
        targetRole: 'Customer',
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
   * Send Review Request — Inbox + Push + Email + WhatsApp
   */
  async sendReviewRequest(booking: any) {
    if (booking.userId) {
      const frontendUrl = this.configService.get('PUBLIC_URL') || this.configService.get('FRONTEND_URL');
      const reviewLink = `${frontendUrl}/properties/${booking.propertyId}?review=true&bookingId=${booking.id}`;

      try {
        await this.createNotification({
          userId: booking.userId,
          title: 'How was your stay? ⭐',
          message: `We hope you enjoyed your stay at ${booking.property?.name}. Please leave us a review!`,
          type: 'REVIEW_REQUEST',
          targetRole: 'Customer',
          data: { bookingId: booking.id, propertyId: booking.propertyId, reviewLink }
        });
      } catch (err) {
        this.logger.error(`[sendReviewRequest] Inbox notification failed:`, err);
      }

      // Email with direct review link
      try {
        await this.mailService.sendReviewRequestEmail(booking);
      } catch (err) {
        this.logger.error(`[sendReviewRequest] Email failed:`, err);
      }

      // WhatsApp with review link
      const targetNumber = booking.whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone;
      if (targetNumber) {
        try {
          const msg = `How was your stay? ⭐\n\nHi ${booking.user?.firstName}, we hope you enjoyed *${booking.property?.name}*!\n\nWe'd love to hear your feedback. Please leave a quick review here:\n${reviewLink}`;
          await this.sendWhatsApp(targetNumber, msg);
        } catch (err) {
          this.logger.error(`[sendReviewRequest] WhatsApp failed:`, err);
        }
      }

      // Update booking to track reminder sent
      try {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { reviewRequestSentAt: new Date() }
        });
      } catch (err) {
        this.logger.error(`[sendReviewRequest] DB update failed:`, err);
      }
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

  /**
   * Send Balance Payment Reminder (24h before check-in)
   */
  async sendBalanceReminder(booking: any) {
    if (!booking.userId) return;

    const paidAmount = Number(booking.paidAmount || 0);
    const totalAmount = Number(booking.totalAmount);
    const balance = totalAmount - paidAmount;
    const frontendUrl = this.configService.get('PUBLIC_URL') || this.configService.get('FRONTEND_URL');
    const paymentLink = `${frontendUrl}/confirmation?bookingId=${booking.id}`;

    // 1. Internal Notification (Inbox)
    await this.createNotification({
      userId: booking.userId,
      title: 'Payment Reminder: Balance Due 💳',
      message: `Your stay at ${booking.property?.name} is tomorrow. Please complete the remaining balance of ₹${balance.toLocaleString('en-IN')} to ensure a smooth check-in.`,
      type: 'BALANCE_REMINDER',
      targetRole: 'Customer',
      data: { bookingId: booking.id, balance, paymentLink }
    });

    // 2. Email Notification
    await this.mailService.sendBalancePaymentReminder(booking);

    // 3. WhatsApp Notification
    const targetNumber = booking.whatsappNumber || booking.user?.whatsappNumber || booking.user?.phone;
    if (targetNumber) {
      const whatsappMsg = `💳 *Balance Payment Reminder*\n\n` +
        `Your stay at *${booking.property?.name}* starts tomorrow!\n\n` +
        `Booking #: ${booking.bookingNumber}\n` +
        `Remaining Balance: *₹${balance.toLocaleString('en-IN')}*\n\n` +
        `Please complete your payment here:\n${paymentLink}\n\n` +
        `Ignore if already paid. See you soon! 🤝`;
      await this.sendWhatsApp(targetNumber, whatsappMsg);
    }

    // 4. Update booking to track reminder sent
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { balanceReminderSentAt: new Date() }
    });

    this.logger.log(`24h Balance reminder sent for booking ${booking.bookingNumber}`);
  }
}
