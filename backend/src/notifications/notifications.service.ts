import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { Twilio } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';
import { MailService } from '../mail/mail.service';
import { PdfService } from '../pdf/pdf.service';
import axios from 'axios';

interface NotificationPrefs {
  emailReferrals?: boolean;
  emailRewards?: boolean;
  pushBookings?: boolean;
}

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
   * Main entry point for WhatsApp
   */
  async sendWhatsApp(to: string, message: string, templateKey?: string, variables?: any) {
    const provider = this.configService.get('SMS_PROVIDER') || 'TWILIO';
    if (provider === 'MSG91') {
      return this._sendWhatsAppViaMSG91(to, message, templateKey, variables);
    }
    return this._sendWhatsAppViaTwilio(to, message);
  }

  /**
   * Main entry point for SMS
   */
  async sendSMS(to: string, message: string, variables?: Record<string, string>) {
    const provider = this.configService.get('SMS_PROVIDER') || 'TWILIO';
    if (provider === 'MSG91') {
      return this._sendSMSViaMSG91(to, message, variables);
    }
    return this._sendSMSViaTwilio(to, message);
  }

  /**
   * Internal Twilio WhatsApp
   */
  private async _sendWhatsAppViaTwilio(to: string, message: string) {
    const from = this.configService.get('TWILIO_WHATSAPP_NUMBER');

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
      this.logger.log(`WhatsApp sent to ${to} via Twilio`);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp via Twilio to ${to}:`, error);
    }
  }

  /**
   * Internal Twilio SMS
   */
  private async _sendSMSViaTwilio(to: string, message: string) {
    let from = this.configService.get('TWILIO_PHONE_NUMBER');

    if (!from) {
      const whatsappFrom = this.configService.get('TWILIO_WHATSAPP_NUMBER');
      if (whatsappFrom) from = whatsappFrom.replace('whatsapp:', '');
    }

    if (!this.twilioClient || !from) {
      this.logger.warn(`Twilio SMS not configured. Simulating SMS to ${to}: ${message}`);
      return;
    }

    try {
      await this.twilioClient.messages.create({
        body: message,
        from: from,
        to: to,
      });
      this.logger.log(`SMS sent to ${to} via Twilio`);
    } catch (error) {
      this.logger.error(`Failed to send SMS via Twilio to ${to}:`, error);
    }
  }

  /**
   * Internal MSG91 SMS
   */
  private async _sendSMSViaMSG91(to: string, message: string, variables?: Record<string, string>) {
    const authKey = this.configService.get('MSG91_AUTH_KEY');
    const templateId = this.configService.get('MSG91_OTP_TEMPLATE_ID');

    if (!authKey) {
      this.logger.warn(`MSG91 not configured. Simulating SMS to ${to}: ${message}`);
      return;
    }

    // Normalizing phone (removing +)
    const mobile = to.replace('+', '');

    try {
      if (templateId) {
        // If variables are provided, use the Flow/Transaction API
        if (variables) {
          await axios.post('https://api.msg91.com/api/v5/flow/', {
            template_id: templateId,
            recipients: [{
              mobiles: mobile,
              ...variables
            }]
          }, {
            headers: {
              authkey: authKey,
              'Content-Type': 'application/json'
            }
          });
          this.logger.log(`Flow SMS sent to ${to} via MSG91 with variables: ${JSON.stringify(variables)}`);
        } else {
          // Fallback to simple OTP API if it looks like a 6-digit code
          const otpMatch = message.match(/\b\d{6}\b/);
          const otp = otpMatch ? otpMatch[0] : undefined;

          if (otp) {
            await axios.post(`https://api.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${mobile}&authkey=${authKey}&otp=${otp}`);
            this.logger.log(`OTP (${otp}) sent to ${to} via MSG91`);
          } else {
            this.logger.warn(`MSG91 requested but no variables/OTP found. Message: ${message}`);
          }
        }
      } else {
        this.logger.warn(`MSG91 Template ID missing. Check .env. Simulating to ${to}: ${message}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS via MSG91 to ${to}:`, error.response?.data || error.message);
    }
  }

  /**
   * Internal MSG91 WhatsApp
   */
  private async _sendWhatsAppViaMSG91(to: string, message: string, templateKey?: string, variables?: any) {
    const authKey = this.configService.get('MSG91_AUTH_KEY');
    const sender = this.configService.get('MSG91_WHATSAPP_SENDER');
    
    // If templateKey is provided, fetch the actual ID from config
    let templateId = templateKey ? this.configService.get(templateKey) : undefined;
    
    // Fallback: if no templateId found for that key, and templateKey looks like a number/ID, use it directly
    if (!templateId && templateKey) {
      templateId = templateKey;
    }

    if (!authKey) {
      this.logger.warn(`MSG91 not configured. Simulating WhatsApp to ${to}: ${message}`);
      return;
    }

    // Normalizing phone (removing +, whatsapp: prefix)
    const mobile = to.replace('+', '').replace('whatsapp:', '');

    try {
      if (templateId) {
        // MSG91 WhatsApp uses Flow API
        await axios.post('https://api.msg91.com/api/v5/flow/', {
          template_id: templateId,
          sender: sender,
          recipients: [{
            mobiles: mobile,
            message: message, // Generic fallback
            ...variables      // Specific template variables
          }]
        }, {
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json'
          }
        });
        this.logger.log(`WhatsApp sent to ${to} via MSG91 (Template: ${templateKey || templateId})`);
      } else {
        this.logger.warn(`MSG91 WhatsApp Template ID missing. Check .env. Simulating to ${to}: ${message}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp via MSG91 to ${to}:`, error.response?.data || error.message);
    }
  }

  /**
   * Convenience method for New Booking Alert
   * Idempotent: checks for an existing BOOKING_CONFIRMED notification before sending
   * to prevent duplicates triggered by both verifyPayment and handlePaymentCaptured.
   */
  async broadcastNewBooking(booking: any) {
    console.log(`[NotificationsService] [DEBUG] Booking properties:`, Object.keys(booking));
    console.log(`[NotificationsService] [DEBUG] booking.property:`, !!booking.property);
    console.log(`[NotificationsService] [DEBUG] booking.roomType:`, !!booking.roomType);
    console.log(`[NotificationsService] [DEBUG] booking.user:`, !!booking.user);
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
          await this.sendWhatsApp(propertyPhone, whatsappMsg, 'MSG91_TPL_PROP_BOOKING', {
            booking_number: booking.bookingNumber,
            status: 'New Booking',
            details: `New booking received! Amount: ₹${booking.totalAmount}. Source: Website.`,
            link_suffix: `bookings/${booking.id}`
          });
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
          await this.sendWhatsApp(targetNumber, whatsappMsg, 'MSG91_TPL_GUEST_BOOKING', {
            booking_number: booking.bookingNumber,
            resort_name: booking.property?.name,
            status: 'Confirmed',
            details: `Hi ${booking.user?.firstName}, your stay for ${booking.totalNights} nights is confirmed. Check-in: ${new Date(booking.checkInDate).toLocaleDateString()}.`,
            link_suffix: `confirmation?bookingId=${booking.id}`,
            footer: 'Sent via Loud IMC Resort Portal'
          });
        } catch (err) {
          this.logger.error(`[broadcastNewBooking] Guest WhatsApp failed to ${targetNumber}:`, err);
        }
      }
    }

    // 4. Notification for Channel Partner (if applicable)
    if (isCPBooked && booking.channelPartner?.userId) {
      // Fetch CP with preferences
      const cp = await this.prisma.channelPartner.findUnique({
        where: { id: booking.channelPartnerId },
        select: {
          notificationPrefs: true,
          user: { select: { email: true, phone: true } }
        }
      });

      const prefs = (cp?.notificationPrefs as unknown as NotificationPrefs) || { emailReferrals: true, emailRewards: true, pushBookings: true };

      // Socket & DB Notification (Persistent inbox always gets it)
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

      // Premium Email to CP (RESPECT PREFS)
      if (prefs.emailReferrals && cp?.user?.email && pdfAttachment) {
        try {
          await this.mailService.sendChannelPartnerBookingAlert(cp.user.email, booking, pdfAttachment);
        } catch (err) {
          this.logger.error(`[broadcastNewBooking] CP email failed:`, err);
        }
      }

      // WhatsApp for CP (RESPECT PREFS - Push Bookings flag)
      if (prefs.pushBookings && cp?.user?.phone) {
        try {
          const cpMsg = `💰 *New Referral Booking!*\n\n` +
            `Booking #: ${booking.bookingNumber}\n` +
            `Property: ${booking.property?.name}\n` +
            `Commission earned: ₹${booking.cpCommission}`;
          await this.sendWhatsApp(cp.user.phone, cpMsg, 'MSG91_TPL_PARTNER_ALERTS', {
            title: 'New Referral Booking! 💰',
            body: `Booking #${booking.bookingNumber} at ${booking.property?.name}. Commission: ₹${booking.cpCommission}`
          });
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
        await this.sendWhatsApp(targetNumber, msg, 'MSG91_TPL_GUEST_STAY', {
          guest_name: booking.user?.firstName,
          status: 'Checked In',
          resort_name: booking.property?.name,
          link_suffix: '',
          footer: 'Sent via Loud IMC Resort Portal'
        });
      }

      // 4. Notify Channel Partner of Check-in (if applicable & pref enabled)
      if (booking.channelPartnerId) {
        const cp = await this.prisma.channelPartner.findUnique({
          where: { id: booking.channelPartnerId },
          select: {
            notificationPrefs: true,
            userId: true,
            user: { select: { phone: true } }
          }
        });
        const prefs = (cp?.notificationPrefs as unknown as NotificationPrefs) || { pushBookings: true };
        if (prefs.pushBookings && cp) {
          // Inbox
          await this.createNotification({
            userId: cp.userId,
            title: 'Guest Checked In! 🏨',
            message: `Your referral guest ${booking.user?.firstName} has checked in at ${booking.property?.name}.`,
            type: 'CP_GUEST_CHECKIN',
            targetRole: 'ChannelPartner',
            data: { bookingId: booking.id }
          });
          // WhatsApp
          if (cp.user?.phone) {
            const msg = `🏨 *Guest Checked In!*\n\nYour referral guest ${booking.user?.firstName} ${booking.user?.lastName} has checked in at *${booking.property?.name}*.`;
            await this.sendWhatsApp(cp.user.phone, msg, 'MSG91_TPL_PARTNER_ALERTS', {
              title: 'Guest Arrived! 🏨',
              body: `Your guest ${booking.user?.firstName} has checked in at ${booking.property?.name}. Status: In-house.`
            });
          }
        }
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
        await this.sendWhatsApp(targetNumber, msg, 'MSG91_TPL_GUEST_STAY', {
          guest_name: booking.user?.firstName,
          status: 'Checked Out',
          resort_name: booking.property?.name,
          link_suffix: '',
          footer: 'Sent via Loud IMC Resort Portal'
        });
      }

      // 4. Notify Channel Partner of Check-out
      if (booking.channelPartnerId) {
        const cp = await this.prisma.channelPartner.findUnique({
          where: { id: booking.channelPartnerId },
          select: {
            notificationPrefs: true,
            userId: true,
            user: { select: { phone: true } }
          }
        });
        const prefs = (cp?.notificationPrefs as unknown as NotificationPrefs) || { pushBookings: true };
        if (prefs.pushBookings && cp) {
          // Inbox
          await this.createNotification({
            userId: cp.userId,
            title: 'Guest Checked Out! 😊',
            message: `Your referral guest ${booking.user?.firstName} has checked out from ${booking.property?.name}.`,
            type: 'CP_GUEST_CHECKOUT',
            targetRole: 'ChannelPartner',
            data: { bookingId: booking.id }
          });
          // WhatsApp
          if (cp.user?.phone) {
            const msg = `😊 *Guest Checked Out!*\n\nYour referral guest ${booking.user?.firstName} ${booking.user?.lastName} has checked out from *${booking.property?.name}*.`;
            await this.sendWhatsApp(cp.user.phone, msg, 'MSG91_TPL_PARTNER_ALERTS', {
              title: 'Guest Departed! 😊',
              body: `Your guest ${booking.user?.firstName} has checked out from ${booking.property?.name}. Status: Completed.`
            });
          }
        }
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
          await this.sendWhatsApp(targetNumber, msg, 'MSG91_TPL_GUEST_BOOKING', {
            booking_number: booking.bookingNumber,
            resort_name: booking.property?.name,
            status: 'Cancelled',
            details: `Refund of ₹${refundAmount.toLocaleString('en-IN')} will be processed in 5-7 business days.`,
            link_suffix: `confirmation?bookingId=${booking.id}`,
            footer: 'Sent via Loud IMC Resort Portal'
          });
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
          await this.sendWhatsApp(targetNumber, msg, 'MSG91_TPL_ACTION_LINKS', {
            guest_name: booking.user?.firstName,
            message: `How was your stay at ${booking.property?.name}? We'd love your feedback!`,
            link: reviewLink,
            footer: 'Sent via Loud IMC Resort Portal'
          });
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
   * Notify CP when points/commission are earned
   */
  async notifyPointsEarned(cpId: string, points: number, description: string) {
    const cp = await this.prisma.channelPartner.findUnique({
      where: { id: cpId },
      include: { user: true }
    });

    if (!cp) return;

    const prefs = (cp.notificationPrefs as unknown as NotificationPrefs) || { emailRewards: true };

    // Dashboard Inbox (Always)
    await this.createNotification({
      userId: cp.userId,
      title: 'Points Earned! 💰',
      message: `${points} points added to your wallet: ${description}`,
      type: 'CP_POINTS_EARNED',
      targetRole: 'ChannelPartner',
      data: { points, description }
    });

    // Email (Respect Prefs)
    if (prefs.emailRewards && cp.user?.email) {
      try {
        await this.mailService.sendPointsEarnedEmail(cp.user.email, points, description);
      } catch (err) {
        this.logger.error(`[notifyPointsEarned] Email failed:`, err);
      }
    }

    // WhatsApp (New)
    if (cp.user?.phone) {
      try {
        const msg = `💰 *Points Earned!*\n\n${points} points added to your wallet.\nReason: ${description}`;
        await this.sendWhatsApp(cp.user.phone, msg, 'MSG91_TPL_PARTNER_ALERTS', {
          title: 'Points Earned! 💰',
          body: `${description}. Balance Added: ${points} points.`
        });
      } catch (err) {
        this.logger.error(`[notifyPointsEarned] WhatsApp failed:`, err);
      }
    }
  }

  /**
   * Notify CP when a reward redemption status changes
   */
  async notifyRedemptionStatusUpdate(redemptionId: string) {
    const redemption = await this.prisma.cPRewardRedemption.findUnique({
      where: { id: redemptionId },
      include: {
        reward: true,
        channelPartner: { include: { user: true } }
      }
    });

    if (!redemption || !redemption.channelPartner) return;

    const cp = redemption.channelPartner;
    const prefs = (cp.notificationPrefs as unknown as NotificationPrefs) || { emailRewards: true };

    // Dashboard Inbox (Always)
    await this.createNotification({
      userId: cp.userId,
      title: 'Reward Claim Update 🎁',
      message: `Your claim for "${redemption.reward.name}" is now ${redemption.status}.`,
      type: 'CP_REDEMPTION_UPDATE',
      targetRole: 'ChannelPartner',
      data: { redemptionId: redemption.id, status: redemption.status }
    });

    // Email (Respect Prefs)
    if (prefs.emailRewards && cp.user?.email) {
      try {
        await this.mailService.sendRedemptionStatusEmail(
          cp.user.email,
          redemption.reward.name,
          redemption.status,
          redemption.notes || ''
        );
      } catch (err) {
        this.logger.error(`[notifyRedemptionStatusUpdate] Email failed:`, err);
      }
    }

    // WhatsApp (New)
    if (cp.user?.phone) {
      try {
        const msg = `🎁 *Reward Claim Update*\n\nYour claim for "${redemption.reward.name}" is now *${redemption.status}*.`;
        await this.sendWhatsApp(cp.user.phone, msg, 'MSG91_TPL_PARTNER_ALERTS', {
          title: 'Reward Claim Update 🎁',
          body: `Your claim for "${redemption.reward.name}" is now ${redemption.status}. Notes: ${redemption.notes || 'None'}`
        });
      } catch (err) {
        this.logger.error(`[notifyRedemptionStatusUpdate] WhatsApp failed:`, err);
      }
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
      await this.sendWhatsApp(targetNumber, whatsappMsg, 'MSG91_TPL_ACTION_LINKS', {
        guest_name: booking.user?.firstName,
        message: `Balance payment of ₹${balance.toLocaleString('en-IN')} is due for your stay at ${booking.property?.name}`,
        link: paymentLink,
        footer: 'Sent via Loud IMC Resort Portal'
      });
    }

    // 4. Update booking to track reminder sent
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { balanceReminderSentAt: new Date() }
    });

    this.logger.log(`24h Balance reminder sent for booking ${booking.bookingNumber}`);
  }
}
