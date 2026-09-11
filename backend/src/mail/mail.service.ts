import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private emailProvider: 'SMTP' | 'MSG91';
    private readonly logger = new Logger(MailService.name);

    constructor(private configService: ConfigService) {
        this.emailProvider = (this.configService.get('EMAIL_PROVIDER') || 'SMTP').toUpperCase() as 'SMTP' | 'MSG91';
        this.logger.log(`[MailService] Email provider: ${this.emailProvider}`);

        this.transporter = nodemailer.createTransport({
            pool: true,
            host: this.configService.get('SMTP_HOST'),
            port: Number(this.configService.get('SMTP_PORT')),
            secure: false, // true for 465, false for 587
            auth: {
                user: this.configService.get('SMTP_USER'),
                pass: this.configService.get('SMTP_PASSWORD'),
            },
            tls: {
                rejectUnauthorized: false,
                ciphers: 'SSLv3',
            },
        });
    }

    /**
     * Helper to render standardized luxury Oreedu email wrapper
     */
    private wrapEmailHtml(content: {
        headerGradient?: string;
        badgeText?: string;
        badgeBg?: string;
        badgeColor?: string;
        title: string;
        subtitle?: string;
        bodyHtml: string;
        footerNote?: string;
    }): string {
        const headerBg = content.headerGradient || 'linear-gradient(135deg, #093f4a 0%, #0e5b6a 100%)';
        const year = new Date().getFullYear();

        return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title}</title>
          <style>
              body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
              .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding: 30px 0 50px 0; }
              .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #0f172a; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0; }
              .header { background: ${headerBg}; padding: 36px 30px; text-align: center; color: #ffffff; }
              .logo-container { margin-bottom: 12px; }
              .brand-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }
              .header h1 { font-size: 24px; font-weight: 800; margin: 8px 0 4px 0; color: #ffffff; letter-spacing: -0.3px; }
              .header p { font-size: 14px; margin: 0; color: rgba(255, 255, 255, 0.85); font-weight: 500; }
              .content { padding: 36px 32px; }
              .card { background-color: #f8fafc; border-radius: 14px; padding: 22px; margin: 24px 0; border: 1px solid #e2e8f0; }
              .detail-table { width: 100%; border-spacing: 0; }
              .detail-table td { padding: 11px 0; border-bottom: 1px solid #e2e8f0; }
              .detail-table tr:last-child td { border-bottom: none; }
              .label { color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; width: 40%; }
              .value { color: #0f172a; font-size: 14px; font-weight: 700; text-align: right; }
              .btn-container { text-align: center; margin: 30px 0 10px 0; }
              .btn { display: inline-block; background: #093f4a; color: #ffffff !important; padding: 15px 34px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(9, 63, 74, 0.25); text-align: center; }
              .footer { text-align: center; padding: 28px 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #ffffff; }
              .footer-brand { font-weight: 700; color: #475569; margin: 0 0 4px 0; font-size: 13px; }
              .footer-sub { margin: 0; color: #94a3b8; }
          </style>
      </head>
      <body>
          <div class="wrapper">
              <!--[if mso]>
              <table align="center" width="600" style="border-spacing: 0; font-family: sans-serif;">
              <tr><td style="padding: 0;">
              <![endif]-->
              <table class="main" width="100%" align="center">
                  <tr>
                      <td class="header">
                          <div class="logo-container">
                              <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                  <tr>
                                      <td align="center" style="font-size: 26px; font-weight: 900; letter-spacing: 3.5px; color: #ffffff; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                          OREEDU
                                      </td>
                                  </tr>
                              </table>
                          </div>
                          ${content.badgeText ? `
                          <div>
                              <span class="brand-badge" style="background: ${content.badgeBg || 'rgba(255,255,255,0.2)'}; color: ${content.badgeColor || '#ffffff'};">
                                  ${content.badgeText}
                              </span>
                          </div>` : ''}
                          <h1>${content.title}</h1>
                          ${content.subtitle ? `<p>${content.subtitle}</p>` : ''}
                      </td>
                  </tr>
                  <tr>
                      <td class="content">
                          ${content.bodyHtml}
                      </td>
                  </tr>
                  <tr>
                      <td class="footer">
                          ${content.footerNote ? `<p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">${content.footerNote}</p>` : ''}
                          <p class="footer-brand">Oreedu Hospitality Technologies</p>
                          <p class="footer-sub">© ${year} Oreedu. All rights reserved.</p>
                      </td>
                  </tr>
              </table>
              <!--[if mso]>
              </td></tr></table>
              <![endif]-->
          </div>
      </body>
      </html>
        `;
    }

    /**
     * Send email via MSG91 template API.
     */
    private async sendEmailViaMSG91(
        to: string,
        toName: string,
        templateId: string,
        variables: Record<string, string> = {},
    ): Promise<void> {
        const authKey = this.configService.get('MSG91_AUTH_KEY');
        const domain = this.configService.get('MSG91_EMAIL_DOMAIN');   // e.g. mail.myoreedu.com
        const fromEmail = this.configService.get('MSG91_EMAIL_FROM');   // e.g. noreply@myoreedu.com
        const fromName = this.configService.get('MSG91_EMAIL_FROM_NAME') || 'Oreedu';

        if (!authKey || !domain || !fromEmail) {
            this.logger.warn(`[MailService] MSG91 email not configured (MSG91_AUTH_KEY / MSG91_EMAIL_DOMAIN / MSG91_EMAIL_FROM missing). Skipping email to ${to}.`);
            return;
        }

        const payload = {
            recipients: [
                {
                    to: [{ name: toName, email: to }],
                    variables,
                }
            ],
            from: { name: fromName, email: fromEmail },
            domain,
            template_id: templateId,
        };

        try {
            await axios.post('https://control.msg91.com/api/v5/email/send', payload, {
                headers: {
                    authkey: authKey,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`[MailService] Email sent via MSG91 to ${to} (template: ${templateId})`);
        } catch (error: any) {
            this.logger.error(`[MailService] MSG91 email failed to ${to}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async sendBookingConfirmation(booking: any, attachment?: { filename: string, content: Buffer }) {
        console.log(`[MailService] Sending PREMIUM booking confirmation to ${booking.user?.email}`);
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const to = booking.user?.email;
        if (!to) return;

        const subject = `Booking Confirmed - ${booking.bookingNumber} at ${booking.property?.name || 'Oreedu'}`;

        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        const isPartial = booking.paymentStatus === 'PARTIAL';
        const paidAmount = Number(booking.paidAmount || 0);
        const totalAmount = Number(booking.totalAmount);
        const balance = totalAmount - paidAmount;
        const frontendUrl = this.configService.get('PUBLIC_URL') || this.configService.get('FRONTEND_URL') || 'https://myoreedu.com';

        const bodyHtml = `
            <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; padding: 6px 18px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; background: ${isPartial ? '#fef3c7' : '#dcfce7'}; color: ${isPartial ? '#92400e' : '#166534'};">
                    ${isPartial ? 'Partial Payment Confirmed' : 'Fully Paid & Confirmed'}
                </span>
            </div>

            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
                Hello <strong>${booking.user?.firstName || 'Guest'}</strong>, we're thrilled to have you! Your reservation at <strong>${booking.property?.name || 'our partner property'}</strong> is confirmed.
            </p>

            <div class="card">
                <table class="detail-table">
                    <tr>
                        <td class="label">Reservation #</td>
                        <td class="value">${booking.bookingNumber}</td>
                    </tr>
                    <tr>
                        <td class="label">Guest Name</td>
                        <td class="value">${booking.user?.firstName} ${booking.user?.lastName || ''}</td>
                    </tr>
                    <tr>
                        <td class="label">Room Type</td>
                        <td class="value">${booking.roomType?.name || 'Standard Accommodation'}</td>
                    </tr>
                    <tr>
                        <td class="label">Check-in</td>
                        <td class="value">${checkIn}</td>
                    </tr>
                    <tr>
                        <td class="label">Check-out</td>
                        <td class="value">${checkOut}</td>
                    </tr>
                </table>
            </div>

            <div style="background: #f1f5f9; border-radius: 14px; padding: 20px; text-align: center; margin-top: 20px;">
                <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    ${isPartial ? 'Total Booking Value' : 'Total Amount Paid'}
                </div>
                <div style="font-size: 32px; font-weight: 800; color: #093f4a; margin-top: 4px;">
                    ₹${totalAmount.toLocaleString('en-IN')}
                </div>
                ${isPartial ? `
                    <div style="color: #0d9488; font-size: 13px; font-weight: 700; margin-top: 6px;">
                        Paid: ₹${paidAmount.toLocaleString('en-IN')}
                    </div>
                    <div style="color: #e11d48; font-size: 13px; font-weight: 700; margin-top: 2px;">
                        Remaining Balance: ₹${balance.toLocaleString('en-IN')}
                    </div>
                ` : ''}
            </div>

            <div class="btn-container">
                <a href="${frontendUrl}/confirmation?bookingId=${booking.id}" class="btn">View Reservation Details</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #093f4a 0%, #0e5b6a 100%)',
            badgeText: 'Booking Confirmed',
            badgeBg: '#14b8a6',
            badgeColor: '#ffffff',
            title: 'Your Stay is Confirmed! 🏨',
            subtitle: `Reservation ${booking.bookingNumber} at ${booking.property?.name}`,
            bodyHtml,
            footerNote: "Need assistance? Reply directly to this email or visit our support portal."
        });

        try {
            await this.transporter.sendMail({
                from,
                to,
                subject,
                html,
                attachments: attachment ? [attachment] : [],
            });
            console.log(`[MailService] Confirmation sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending email:', error);
        }
    }

    async sendPropertyNewBookingAlert(propertyEmail: string, booking: any, attachment?: { filename: string, content: Buffer }) {
        console.log(`[MailService] Sending email to property ${propertyEmail} for booking ${booking.bookingNumber}`);
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const subject = `🚀 New Booking Received - ${booking.bookingNumber} at ${booking.property?.name}`;

        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        const isPartial = booking.paymentStatus === 'PARTIAL';
        const paidAmount = Number(booking.paidAmount || 0);
        const totalAmount = Number(booking.totalAmount);
        const propertyUrl = this.configService.get('PROPERTY_URL') || 'https://property.myoreedu.com';

        const bodyHtml = `
            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
                Great news! A new reservation has been made for <strong>${booking.property?.name}</strong>.
            </p>

            <div class="card">
                <table class="detail-table">
                    <tr>
                        <td class="label">Reservation #</td>
                        <td class="value">${booking.bookingNumber}</td>
                    </tr>
                    <tr>
                        <td class="label">Guest Name</td>
                        <td class="value">${booking.user?.firstName} ${booking.user?.lastName || ''}</td>
                    </tr>
                    <tr>
                        <td class="label">Accommodation</td>
                        <td class="value">${booking.roomType?.name || 'Standard'}</td>
                    </tr>
                    <tr>
                        <td class="label">Dates</td>
                        <td class="value">${checkIn} – ${checkOut}</td>
                    </tr>
                    <tr>
                        <td class="label">Source</td>
                        <td class="value">${booking.channelPartnerId ? 'Channel Partner' : 'Direct Booking'}</td>
                    </tr>
                </table>
            </div>

            <div style="background: #093f4a; color: #ffffff; border-radius: 14px; padding: 22px; text-align: center; margin-top: 20px;">
                <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">
                    Total Booking Amount
                </div>
                <div style="font-size: 28px; font-weight: 800; color: #ffffff; margin-top: 4px;">
                    ₹${totalAmount.toLocaleString('en-IN')}
                </div>
                <div style="margin-top: 10px;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: ${isPartial ? '#fef3c7' : '#dcfce7'}; color: ${isPartial ? '#92400e' : '#166534'};">
                        ${isPartial ? `Partial Paid: ₹${paidAmount.toLocaleString('en-IN')}` : 'Full Payment Received'}
                    </span>
                </div>
            </div>

            <div class="btn-container">
                <a href="${propertyUrl}/bookings" class="btn">View & Process Booking</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #093f4a 0%, #0d5360 100%)',
            badgeText: 'Property Booking Alert',
            badgeBg: '#38bdf8',
            badgeColor: '#093f4a',
            title: 'New Reservation Received! 🎉',
            subtitle: `${booking.bookingNumber} • ${booking.property?.name}`,
            bodyHtml,
            footerNote: "Oreedu Property Management System"
        });

        try {
            await this.transporter.sendMail({
                from,
                to: propertyEmail,
                subject,
                html,
                attachments: attachment ? [attachment] : []
            });
        } catch (error) {
            console.error('[MailService] Error sending property alert:', error);
        }
    }

    async sendChannelPartnerBookingAlert(cpEmail: string, booking: any, attachment?: { filename: string, content: Buffer }) {
        console.log(`[MailService] Sending email to Channel Partner ${cpEmail} for booking ${booking.bookingNumber}`);
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const subject = `💰 New Referral Booking Earned! - ${booking.bookingNumber}`;

        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const commission = Number(booking.cpCommission || 0).toLocaleString('en-IN');
        const totalAmount = Number(booking.totalAmount).toLocaleString('en-IN');
        const cpUrl = this.configService.get('CHANNEL_PARTNER_URL') || 'https://cp.myoreedu.com';

        const bodyHtml = `
            <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 14px; padding: 25px; text-align: center; border: 1px solid #99f6e4; margin-bottom: 24px;">
                <div style="font-size: 12px; color: #0d9488; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                    Estimated Commission
                </div>
                <div style="font-size: 38px; color: #0f766e; font-weight: 900; margin-top: 4px;">
                    ₹${commission}
                </div>
            </div>

            <div class="card">
                <table class="detail-table">
                    <tr>
                        <td class="label">Booking #</td>
                        <td class="value">${booking.bookingNumber}</td>
                    </tr>
                    <tr>
                        <td class="label">Guest Name</td>
                        <td class="value">${booking.user?.firstName} ${booking.user?.lastName || ''}</td>
                    </tr>
                    <tr>
                        <td class="label">Property</td>
                        <td class="value">${booking.property?.name}</td>
                    </tr>
                    <tr>
                        <td class="label">Total Booking</td>
                        <td class="value">₹${totalAmount}</td>
                    </tr>
                    <tr>
                        <td class="label">Dates</td>
                        <td class="value">${checkIn} – ${checkOut}</td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center; margin-top: 20px;">
                Your referral commission has been tracked and will be settled to your wallet once the guest completes their stay.
            </p>

            <div class="btn-container">
                <a href="${cpUrl}/referrals" class="btn">View My Referrals</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #093f4a 0%, #0d5360 100%)',
            badgeText: 'Oreedu Partner Network',
            badgeBg: '#14b8a6',
            badgeColor: '#ffffff',
            title: 'Commission Earned! 💰',
            subtitle: `Referral Booking ${booking.bookingNumber}`,
            bodyHtml,
            footerNote: "Oreedu Channel Partner Network"
        });

        try {
            await this.transporter.sendMail({
                from,
                to: cpEmail,
                subject,
                html,
                attachments: attachment ? [attachment] : []
            });
        } catch (error) {
            console.error('[MailService] Error sending CP alert:', error);
        }
    }

    async sendBalancePaymentReminder(booking: any) {
        console.log(`[MailService] Sending balance reminder to ${booking.user?.email}`);
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const to = booking.user?.email;
        if (!to) return;

        const subject = `Action Required: Balance Payment for your stay at ${booking.property?.name}`;
        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const paidAmount = Number(booking.paidAmount || 0);
        const totalAmount = Number(booking.totalAmount);
        const balance = totalAmount - paidAmount;
        const frontendUrl = this.configService.get('PUBLIC_URL') || this.configService.get('FRONTEND_URL') || 'https://myoreedu.com';
        const paymentLink = `${frontendUrl}/confirmation?bookingId=${booking.id}`;

        const bodyHtml = `
            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
                Your stay at <strong>${booking.property?.name}</strong> starts soon! Please settle your remaining balance to ensure a swift, contactless check-in.
            </p>

            <div class="card">
                <table class="detail-table">
                    <tr>
                        <td class="label">Reservation #</td>
                        <td class="value">${booking.bookingNumber}</td>
                    </tr>
                    <tr>
                        <td class="label">Check-in Date</td>
                        <td class="value">${checkIn}</td>
                    </tr>
                    <tr>
                        <td class="label">Total Amount</td>
                        <td class="value">₹${totalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td class="label">Paid Amount</td>
                        <td class="value">₹${paidAmount.toLocaleString('en-IN')}</td>
                    </tr>
                </table>
            </div>

            <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 14px; padding: 22px; text-align: center; margin-top: 20px;">
                <div style="font-size: 12px; font-weight: 800; color: #e11d48; text-transform: uppercase; letter-spacing: 1px;">
                    Remaining Balance Due
                </div>
                <div style="font-size: 34px; font-weight: 900; color: #e11d48; margin-top: 4px;">
                    ₹${balance.toLocaleString('en-IN')}
                </div>
            </div>

            <div class="btn-container">
                <a href="${paymentLink}" class="btn" style="background: #e11d48;">Pay Balance Now</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #881337 0%, #be123c 100%)',
            badgeText: 'Payment Reminder',
            badgeBg: '#fb7185',
            badgeColor: '#881337',
            title: 'Pending Balance Reminder 💳',
            subtitle: `Reservation ${booking.bookingNumber}`,
            bodyHtml,
            footerNote: "If you have already settled this payment, please disregard this notice."
        });

        try {
            await this.transporter.sendMail({
                from,
                to,
                subject,
                html,
            });
            console.log(`[MailService] Balance reminder sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending balance reminder email:', error);
        }
    }

    async sendCancellationConfirmation(booking: any) {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const to = booking.user?.email;
        if (!to) return;

        const subject = `Booking Cancelled - ${booking.bookingNumber} at ${booking.property?.name || 'Oreedu'}`;
        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const cancelledAt = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const paidAmount = Number(booking.paidAmount || 0);
        const refundAmount = Number(booking.refundAmount || 0);
        const hasRefund = refundAmount > 0;

        const bodyHtml = `
            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
                Your booking at <strong>${booking.property?.name || 'our property'}</strong> has been successfully cancelled.
            </p>

            <div class="card">
                <table class="detail-table">
                    <tr><td class="label">Booking #</td><td class="value">${booking.bookingNumber}</td></tr>
                    <tr><td class="label">Guest</td><td class="value">${booking.user?.firstName} ${booking.user?.lastName || ''}</td></tr>
                    <tr><td class="label">Property</td><td class="value">${booking.property?.name || '—'}</td></tr>
                    <tr><td class="label">Room Type</td><td class="value">${booking.roomType?.name || '—'}</td></tr>
                    <tr><td class="label">Check-In</td><td class="value">${checkIn}</td></tr>
                    <tr><td class="label">Check-Out</td><td class="value">${checkOut}</td></tr>
                    <tr><td class="label">Amount Paid</td><td class="value">₹${paidAmount.toLocaleString('en-IN')}</td></tr>
                    <tr><td class="label">Cancelled On</td><td class="value">${cancelledAt}</td></tr>
                </table>
            </div>

            ${hasRefund ? `
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px; padding: 20px; margin-top: 20px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 1px;">Refund Initiated</div>
                <div style="font-size: 30px; font-weight: 800; color: #047857; margin-top: 4px;">₹${refundAmount.toLocaleString('en-IN')}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Credit will appear in your account within 5–7 business days.</div>
            </div>
            ` : paidAmount > 0 ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 16px; margin-top: 20px; text-align: center; font-size: 13px; color: #92400e;">
                ⚠️ Based on the cancellation policy, this reservation is non-refundable.
            </div>
            ` : ''}
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #334155 0%, #475569 100%)',
            badgeText: 'Cancellation Notice',
            badgeBg: '#64748b',
            badgeColor: '#ffffff',
            title: 'Booking Cancelled',
            subtitle: `Reservation ${booking.bookingNumber}`,
            bodyHtml,
        });

        try {
            await this.transporter.sendMail({ from, to, subject, html });
            console.log(`[MailService] Cancellation confirmation sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending cancellation confirmation:', error);
        }
    }

    async sendRefundReceipt(booking: any, refundAmount: number, refundMode: string = 'Original Payment Method') {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const to = booking.user?.email;
        if (!to) return;

        const subject = `Refund Processed - ₹${refundAmount.toLocaleString('en-IN')} for Booking ${booking.bookingNumber}`;
        const processedAt = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        const bodyHtml = `
            <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 14px; padding: 25px; margin-bottom: 24px; text-align: center; border: 1px solid #a7f3d0;">
                <div style="font-size: 12px; color: #059669; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Refund Amount</div>
                <div style="font-size: 38px; color: #047857; font-weight: 900; margin-top: 4px;">₹${refundAmount.toLocaleString('en-IN')}</div>
            </div>

            <div class="card">
                <table class="detail-table">
                    <tr><td class="label">Booking #</td><td class="value">${booking.bookingNumber}</td></tr>
                    <tr><td class="label">Property</td><td class="value">${booking.property?.name || '—'}</td></tr>
                    <tr><td class="label">Refund To</td><td class="value">${refundMode}</td></tr>
                    <tr><td class="label">Processed On</td><td class="value">${processedAt}</td></tr>
                </table>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.6; text-align: center; margin-top: 20px;">
                Please allow 5–7 business days for the refund to reflect in your bank statement.
            </p>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            badgeText: 'Refund Processed',
            badgeBg: '#34d399',
            badgeColor: '#064e3b',
            title: 'Refund Processed ✅',
            subtitle: `Booking ${booking.bookingNumber}`,
            bodyHtml,
        });

        try {
            await this.transporter.sendMail({ from, to, subject, html });
            console.log(`[MailService] Refund receipt sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending refund receipt:', error);
        }
    }

    async sendCheckInReminderEmail(booking: any) {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const to = booking.user?.email;
        if (!to) return;

        const subject = `Reminder: Your stay at ${booking.property?.name} starts tomorrow!`;
        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const frontendUrl = this.configService.get('PUBLIC_URL') || this.configService.get('FRONTEND_URL') || 'https://myoreedu.com';

        const bodyHtml = `
            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
                We're excited to welcome you at <strong>${booking.property?.name}</strong>. Your stay begins tomorrow!
            </p>

            <div class="card">
                <table class="detail-table">
                    <tr><td class="label">Booking #</td><td class="value">${booking.bookingNumber}</td></tr>
                    <tr><td class="label">Guest</td><td class="value">${booking.user?.firstName} ${booking.user?.lastName || ''}</td></tr>
                    <tr><td class="label">Property</td><td class="value">${booking.property?.name}</td></tr>
                    <tr><td class="label">Room Type</td><td class="value">${booking.roomType?.name || '—'}</td></tr>
                    <tr><td class="label">Check-In</td><td class="value">${checkIn}</td></tr>
                    <tr><td class="label">Check-Out</td><td class="value">${checkOut}</td></tr>
                    <tr><td class="label">Check-In Time</td><td class="value">2:00 PM onwards</td></tr>
                </table>
            </div>

            <div style="background: #f8fafc; border-radius: 12px; padding: 18px; margin-top: 20px; border: 1px solid #e2e8f0;">
                <div style="font-size: 12px; color: #475569; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Before You Arrive</div>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.6;">
                    <li>Carry valid government photo ID for all adult guests.</li>
                    <li>Early check-in is subject to availability upon request.</li>
                    ${booking.paymentStatus === 'PARTIAL' ? `<li style="color: #e11d48; font-weight: 700;">Please complete any pending balance before check-in.</li>` : ''}
                </ul>
            </div>

            <div class="btn-container">
                <a href="${frontendUrl}/confirmation?bookingId=${booking.id}" class="btn">View Reservation Details</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            badgeText: 'Stay Reminder',
            badgeBg: '#38bdf8',
            badgeColor: '#082f49',
            title: 'See You Tomorrow! 🏨',
            subtitle: `Reservation ${booking.bookingNumber} at ${booking.property?.name}`,
            bodyHtml,
        });

        try {
            await this.transporter.sendMail({ from, to, subject, html });
            console.log(`[MailService] Check-in reminder sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending check-in reminder:', error);
        }
    }

    async sendReviewRequestEmail(booking: any) {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const to = booking.user?.email;
        if (!to) return;

        const frontendUrl = this.configService.get('PUBLIC_URL') || this.configService.get('FRONTEND_URL') || 'https://myoreedu.com';
        const reviewLink = `${frontendUrl}/properties/${booking.propertyId}?review=true&bookingId=${booking.id}`;
        const subject = `How was your stay at ${booking.property?.name}? ⭐`;

        const bodyHtml = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 28px; letter-spacing: 4px;">⭐⭐⭐⭐⭐</div>
            </div>

            <p style="font-size: 15px; color: #334155; line-height: 1.6; text-align: center; margin-bottom: 20px;">
                Hi <strong>${booking.user?.firstName || 'there'}</strong>, we would love to hear about your experience at <strong>${booking.property?.name}</strong>. Your feedback helps other travellers make great memories.
            </p>

            <div class="btn-container">
                <a href="${reviewLink}" class="btn" style="background: #d97706;">Write a Review</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            badgeText: 'Guest Review',
            badgeBg: '#fde68a',
            badgeColor: '#78350f',
            title: 'How Was Your Stay? ✨',
            subtitle: `Stay at ${booking.property?.name}`,
            bodyHtml,
        });

        try {
            await this.transporter.sendMail({ from, to, subject, html });
            console.log(`[MailService] Review request sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending review request:', error);
        }
    }

    async sendPasswordResetOtp(email: string, otp: string) {
        console.log(`[MailService] Sending password reset OTP to ${email}`);
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu Security <noreply@myoreedu.com>';
        const subject = `Reset Your Password - Verification Code: ${otp}`;

        const bodyHtml = `
            <p style="font-size: 15px; color: #334155; line-height: 1.6; text-align: center; margin-bottom: 24px;">
                We received a request to reset your password. Enter the 6-digit verification code below to proceed:
            </p>

            <div style="background: #f8fafc; border: 2px dashed #093f4a; border-radius: 16px; padding: 24px; margin: 20px auto; text-align: center; max-width: 320px;">
                <div style="font-size: 42px; font-weight: 900; color: #093f4a; letter-spacing: 8px; font-family: monospace;">
                    ${otp}
                </div>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.6; text-align: center; margin-top: 24px;">
                This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, you can safely ignore this email — your account remains secure.
            </p>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #093f4a 0%, #0d5360 100%)',
            badgeText: 'Security Verification',
            badgeBg: '#38bdf8',
            badgeColor: '#093f4a',
            title: 'Password Reset Code 🔐',
            subtitle: 'Secure verification for your Oreedu account',
            bodyHtml,
        });

        try {
            if (this.emailProvider === 'MSG91') {
                const templateId = this.configService.get('MSG91_TPL_EMAIL_OTP') || this.configService.get('MSG91_OTP_TEMPLATE_ID');
                if (templateId) {
                    await this.sendEmailViaMSG91(email, email, templateId, { otp });
                    return;
                }
            }
            await this.transporter.sendMail({ from, to: email, subject, html });
            console.log(`[MailService] Password reset OTP sent to ${email}`);
        } catch (error) {
            console.error('[MailService] Error sending password reset OTP:', error);
        }
    }

    async sendPointsEarnedEmail(cpEmail: string, points: number, description: string) {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const subject = `💰 You've Earned ${points} New Points!`;
        const cpUrl = this.configService.get('CHANNEL_PARTNER_URL') || 'https://cp.myoreedu.com';

        const bodyHtml = `
            <div style="background: #f0fdfa; border: 1px solid #99f6e4; padding: 25px; border-radius: 14px; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 12px; color: #0d9488; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Points Added</div>
                <div style="font-size: 44px; font-weight: 900; color: #0d9488; margin-top: 4px;">+${points}</div>
            </div>
            <p style="color: #475569; font-size: 14px; text-align: center; line-height: 1.6;">${description}</p>
            <div class="btn-container">
                <a href="${cpUrl}/wallet" class="btn">View My Wallet</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #093f4a 0%, #0d5360 100%)',
            badgeText: 'Rewards & Wallet',
            badgeBg: '#14b8a6',
            badgeColor: '#ffffff',
            title: 'Points Added to Wallet! 💰',
            subtitle: 'Oreedu Partner Rewards',
            bodyHtml,
        });

        try {
            await this.transporter.sendMail({ from, to: cpEmail, subject, html });
        } catch (error) {
            console.error('[MailService] Error sending points email:', error);
        }
    }

    async sendRedemptionStatusEmail(cpEmail: string, rewardName: string, status: string, notes: string) {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const subject = `🎁 Reward Claim Update: ${rewardName}`;
        const cpUrl = this.configService.get('CHANNEL_PARTNER_URL') || 'https://cp.myoreedu.com';

        const bodyHtml = `
            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
                There is an update on your reward claim for <strong>${rewardName}</strong>.
            </p>
            <div style="text-align: center; margin: 20px 0;">
                <span style="display: inline-block; padding: 6px 18px; border-radius: 20px; font-weight: 800; font-size: 12px; text-transform: uppercase; background: #e0f2fe; color: #0369a1;">
                    Status: ${status}
                </span>
            </div>
            ${notes ? `<div style="padding: 16px; background: #f8fafc; border-radius: 10px; font-size: 14px; color: #475569; border: 1px solid #e2e8f0; margin-bottom: 20px;"><strong>Note:</strong> ${notes}</div>` : ''}
            <div class="btn-container">
                <a href="${cpUrl}/rewards" class="btn">Track My Claims</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #093f4a 0%, #0d5360 100%)',
            badgeText: 'Partner Rewards',
            badgeBg: '#38bdf8',
            badgeColor: '#082f49',
            title: 'Claim Status Updated 🎁',
            subtitle: rewardName,
            bodyHtml,
        });

        try {
            await this.transporter.sendMail({ from, to: cpEmail, subject, html });
        } catch (error) {
            console.error('[MailService] Error sending redemption email:', error);
        }
    }

    async sendAdminNewPropertyAlert(adminEmail: string, property: any) {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const subject = `🆕 New Property Registration: ${property.name}`;
        const adminUrl = this.configService.get('ADMIN_URL') || 'https://admin.myoreedu.com';

        const bodyHtml = `
            <p style="color: #334155; font-size: 15px; margin-bottom: 20px; line-height: 1.6;">
                A new property has self-registered on the platform and is awaiting administrative approval.
            </p>
            <div class="card">
                <table class="detail-table">
                    <tr><td class="label">Property Name</td><td class="value">${property.name}</td></tr>
                    <tr><td class="label">Type</td><td class="value">${property.type}</td></tr>
                    <tr><td class="label">Location</td><td class="value">${property.city}, ${property.state}</td></tr>
                    <tr><td class="label">Owner</td><td class="value">${property.owner?.firstName || ''} ${property.owner?.lastName || ''}</td></tr>
                    <tr><td class="label">Contact</td><td class="value">${property.email || ''} / ${property.phone || ''}</td></tr>
                </table>
            </div>
            <div class="btn-container">
                <a href="${adminUrl}/properties" class="btn">Review Registration in Admin Panel</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #093f4a 0%, #0d5360 100%)',
            badgeText: 'Admin Notification',
            badgeBg: '#fbbf24',
            badgeColor: '#78350f',
            title: 'New Property Registration 🏨',
            subtitle: property.name,
            bodyHtml,
        });

        try {
            await this.transporter.sendMail({ from, to: adminEmail, subject, html });
        } catch (error) {
            console.error('[MailService] Error sending admin property alert:', error);
        }
    }

    async sendAdminNewCPAlert(adminEmail: string, cp: any) {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const subject = `🤝 New Partner Signup: ${cp.user?.firstName} ${cp.user?.lastName}`;
        const adminUrl = this.configService.get('ADMIN_URL') || 'https://admin.myoreedu.com';

        const bodyHtml = `
            <p style="color: #334155; font-size: 15px; margin-bottom: 20px; line-height: 1.6;">
                A new Channel Partner has applied to join the network.
            </p>
            <div class="card">
                <table class="detail-table">
                    <tr><td class="label">Partner Name</td><td class="value">${cp.user?.firstName} ${cp.user?.lastName || ''}</td></tr>
                    <tr><td class="label">Organization</td><td class="value">${cp.organizationName || 'Individual'}</td></tr>
                    <tr><td class="label">Contact</td><td class="value">${cp.user?.email || ''} / ${cp.user?.phone || ''}</td></tr>
                    <tr><td class="label">Referral Code</td><td class="value">${cp.referralCode}</td></tr>
                </table>
            </div>
            <div class="btn-container">
                <a href="${adminUrl}/partners" class="btn">Review Application</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
            badgeText: 'Admin Notification',
            badgeBg: '#38bdf8',
            badgeColor: '#082f49',
            title: 'New Partner Registration 🤝',
            subtitle: `${cp.user?.firstName} ${cp.user?.lastName}`,
            bodyHtml,
        });

        try {
            await this.transporter.sendMail({ from, to: adminEmail, subject, html });
        } catch (error) {
            console.error('[MailService] Error sending admin CP alert:', error);
        }
    }

    async sendPropertyRegistrationConfirmation(propertyEmail: string, ownerEmail: string, request: any) {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const subject = `🏨 Property Registration Received - ${request.name}`;
        const propertyUrl = this.configService.get('PROPERTY_URL') || 'https://property.myoreedu.com';
        const loginUrl = `${propertyUrl.replace(/\/$/, '')}/login`;

        const bodyHtml = `
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                Thank you for registering <strong>${request.name}</strong> on Oreedu. We have received your request, and our verification team is reviewing the documents.
            </p>

            <div class="card">
                <table class="detail-table">
                    <tr><td class="label">Property Name</td><td class="value">${request.name}</td></tr>
                    <tr><td class="label">Location</td><td class="value">${request.location || '—'}</td></tr>
                    <tr><td class="label">Owner Phone</td><td class="value">${request.ownerPhone || '—'}</td></tr>
                    <tr><td class="label">Status</td><td class="value" style="color: #d97706;">PENDING APPROVAL</td></tr>
                </table>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                Once approved, your property will become live on the guest portal and you can start taking reservations immediately.
            </p>

            <div class="btn-container">
                <a href="${loginUrl}" class="btn">Log In to Your Account</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #093f4a 0%, #0d5360 100%)',
            badgeText: 'Registration Received',
            badgeBg: '#fde68a',
            badgeColor: '#78350f',
            title: 'Registration Received! 🏨',
            subtitle: request.name,
            bodyHtml,
        });

        try {
            if (this.emailProvider === 'MSG91') {
                const templateId = this.configService.get('MSG91_TPL_EMAIL_PROPERTY_REGISTRATION');
                if (templateId) {
                    const variables = {
                        property_name: request.name,
                        location: request.location || '',
                        owner_phone: request.ownerPhone || '',
                        login_url: loginUrl,
                    };
                    await this.sendEmailViaMSG91(propertyEmail, request.name, templateId, variables);
                    if (ownerEmail && ownerEmail !== propertyEmail) {
                        await this.sendEmailViaMSG91(ownerEmail, ownerEmail, templateId, variables);
                    }
                    return;
                }
            }

            await this.transporter.sendMail({ from, to: propertyEmail, subject, html });
            if (ownerEmail && ownerEmail !== propertyEmail) {
                await this.transporter.sendMail({ from, to: ownerEmail, subject, html });
            }
        } catch (error) {
            this.logger.error('[MailService] Error sending property registration confirmation email:', error);
        }
    }

    async sendPropertyApprovalEmail(recipientEmail: string, request: any, isApproved: boolean) {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const propertyUrl = this.configService.get('PROPERTY_URL') || 'https://property.myoreedu.com';
        const loginUrl = `${propertyUrl.replace(/\/$/, '')}/login`;
        const subject = isApproved
            ? `🎉 Your Property "${request.name}" Has Been Approved!`
            : `📋 Update on Your Property Registration — "${request.name}"`;

        const bodyHtml = `
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; padding: 6px 18px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; background: ${isApproved ? '#dcfce7' : '#fef3c7'}; color: ${isApproved ? '#166534' : '#92400e'};">
                    ${isApproved ? '✅ APPROVED & LIVE' : '⚠️ ACTION REQUIRED'}
                </span>
            </div>

            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                ${isApproved
                    ? `Congratulations! Your property <strong>${request.name}</strong> has been reviewed and <strong>approved</strong> by our team. It is now live on Oreedu!`
                    : `We have reviewed the registration for <strong>${request.name}</strong>. Our team requires some additional information before we can approve your property.`
                }
            </p>

            <div class="card">
                <table class="detail-table">
                    <tr><td class="label">Property Name</td><td class="value">${request.name}</td></tr>
                    <tr><td class="label">Location</td><td class="value">${request.location || 'N/A'}</td></tr>
                    <tr><td class="label">Status</td><td class="value" style="color: ${isApproved ? '#059669' : '#d97706'}; font-weight: 800;">${isApproved ? 'APPROVED & LIVE' : 'PENDING CHANGES'}</td></tr>
                </table>
            </div>

            <div class="btn-container">
                <a href="${loginUrl}" class="btn" style="background: ${isApproved ? '#059669' : '#093f4a'};">${isApproved ? 'Go to Your Property Dashboard' : 'Log In to Update Details'}</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: isApproved ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)' : 'linear-gradient(135deg, #093f4a 0%, #0d5360 100%)',
            badgeText: isApproved ? 'Approved & Live' : 'Status Update',
            badgeBg: isApproved ? '#34d399' : '#fbbf24',
            badgeColor: isApproved ? '#064e3b' : '#78350f',
            title: isApproved ? 'Your Property is Live! 🎉' : 'Registration Update 📋',
            subtitle: request.name,
            bodyHtml,
        });

        try {
            if (this.emailProvider === 'MSG91') {
                const templateId = isApproved
                    ? this.configService.get('MSG91_TPL_EMAIL_PROPERTY_APPROVED')
                    : this.configService.get('MSG91_TPL_EMAIL_PROPERTY_REJECTED');
                if (templateId) {
                    await this.sendEmailViaMSG91(recipientEmail, recipientEmail, templateId, {
                        property_name: request.name,
                        location: request.location || '',
                        status: isApproved ? 'APPROVED & LIVE' : 'PENDING ADDITIONAL INFO',
                        login_url: loginUrl,
                    });
                    return;
                }
            }

            await this.transporter.sendMail({ from, to: recipientEmail, subject, html });
            this.logger.log(`[MailService] Property ${isApproved ? 'approval' : 'rejection'} email sent to ${recipientEmail}`);
        } catch (error) {
            this.logger.error(`[MailService] Error sending property ${isApproved ? 'approval' : 'rejection'} email:`, error);
        }
    }

    async sendAdminPropertyRegistrationRequest(adminEmail: string, request: any) {
        const from = this.configService.get('EMAIL_FROM') || 'Oreedu <noreply@myoreedu.com>';
        const adminUrl = this.configService.get('ADMIN_URL') || 'https://admin.myoreedu.com';
        const subject = `🏨 New Property Registration: "${request.name}" — Pending Your Approval`;

        const bodyHtml = `
            <p style="color: #334155; font-size: 15px; margin-bottom: 20px; line-height: 1.6;">
                A new property has self-registered on the platform and is awaiting your review and approval.
            </p>
            <div class="card">
                <table class="detail-table">
                    <tr><td class="label">Property Name</td><td class="value">${request.name}</td></tr>
                    <tr><td class="label">Location</td><td class="value">${request.location || 'N/A'}</td></tr>
                    <tr><td class="label">Owner Email</td><td class="value">${request.ownerEmail}</td></tr>
                    <tr><td class="label">Owner Phone</td><td class="value">${request.ownerPhone || 'N/A'}</td></tr>
                    <tr><td class="label">Status</td><td class="value" style="color: #d97706; font-weight: 800;">PENDING APPROVAL</td></tr>
                </table>
            </div>
            <div class="btn-container">
                <a href="${adminUrl}/properties" class="btn">Review in Admin Panel</a>
            </div>
        `;

        const html = this.wrapEmailHtml({
            headerGradient: 'linear-gradient(135deg, #093f4a 0%, #0d5360 100%)',
            badgeText: 'Admin Alert',
            badgeBg: '#fbbf24',
            badgeColor: '#78350f',
            title: 'New Property Registration 🏨',
            subtitle: `"${request.name}" is waiting for review`,
            bodyHtml,
        });

        try {
            if (this.emailProvider === 'MSG91') {
                const templateId = this.configService.get('MSG91_TPL_EMAIL_ADMIN_PROPERTY_ALERT');
                if (templateId) {
                    await this.sendEmailViaMSG91(adminEmail, 'Admin', templateId, {
                        property_name: request.name,
                        location: request.location || '',
                        owner_email: request.ownerEmail,
                        owner_phone: request.ownerPhone || '',
                        review_url: `${adminUrl}/properties`,
                    });
                    return;
                }
            }

            await this.transporter.sendMail({ from, to: adminEmail, subject, html });
            this.logger.log(`[MailService] Admin property registration alert sent to ${adminEmail}`);
        } catch (error) {
            this.logger.error('[MailService] Error sending admin property registration alert:', error);
        }
    }
}
