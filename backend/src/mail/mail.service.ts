import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('SMTP_HOST'),
            port: Number(this.configService.get('SMTP_PORT')),
            secure: false, // true for 465, false for other ports
            auth: {
                user: this.configService.get('SMTP_USER'),
                pass: this.configService.get('SMTP_PASSWORD'),
            },
        });
    }

    async sendBookingConfirmation(booking: any, attachment?: { filename: string, content: Buffer }) {
        console.log(`[MailService] Sending PREMIUM booking confirmation to ${booking.user.email}`);
        const from = this.configService.get('EMAIL_FROM');
        const to = booking.user.email;
        const subject = `Booking Confirmed - ${booking.bookingNumber} at ${booking.property?.name || 'Route Guide'}`;

        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        const isPartial = booking.paymentStatus === 'PARTIAL';
        const paidAmount = Number(booking.paidAmount || 0);
        const totalAmount = Number(booking.totalAmount);
        const balance = totalAmount - paidAmount;

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { margin: 0; padding: 0; background-color: #f1f8fa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
              .wrapper { width: 100%; table-layout: fixed; background-color: #f1f8fa; padding-bottom: 40px; }
              .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #093f4a; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 20px rgba(9, 63, 74, 0.05); }
              .header { background-color: #093f4a; padding: 40px 20px; text-align: center; }
              .logo-text { color: #f1f8fa; font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
              .hero { padding: 40px 40px 20px 40px; text-align: center; }
              .hero h1 { font-size: 28px; margin: 0; color: #227c8a; font-weight: 800; }
              .hero p { font-size: 16px; color: #62a1b1; margin-top: 10px; }
              .content { padding: 0 40px 40px 40px; }
              .details-box { background-color: #f1f8fa; border-radius: 12px; padding: 20px; margin: 30px 0; border: 1px solid #e3f1f4; }
              
              .detail-table { width: 100%; border-spacing: 0; }
              .detail-table td { padding: 12px 0; border-bottom: 1px solid rgba(34, 124, 138, 0.1); }
              .detail-table tr:last-child td { border-bottom: none; }
              
              .label { color: #62a1b1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 40%; }
              .value { color: #093f4a; font-size: 15px; font-weight: 700; text-align: right; }
              
              .payment-status { text-align: center; margin-bottom: 25px; }
              .badge { display: inline-block; padding: 8px 20px; border-radius: 25px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; }
              .badge-full { background-color: #227c8a; color: #ffffff; }
              .badge-partial { background-color: #fbbf24; color: #093f4a; }
              
              .amount-info { margin-top: 30px; text-align: right; }
              .total-label { font-size: 14px; color: #62a1b1; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
              .total-amount { font-size: 32px; color: #227c8a; font-weight: 800; margin-top: 5px; }
              .balance-text { font-size: 13px; color: #e11d48; font-weight: 700; margin-top: 8px; }
              
              .footer { text-align: center; padding: 30px 20px; font-size: 12px; color: #95c2ce; border-top: 1px solid #f1f8fa; }
              .btn-wrapper { text-align: center; margin-top: 35px; }
              .btn { display: inline-block; background-color: #227c8a; color: #ffffff !important; padding: 16px 35px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(34, 124, 138, 0.2); }
          </style>
      </head>
      <body>
          <div class="wrapper">
              <!--[if mso]>
              <table align="center" width="600" style="border-spacing: 0; font-family: sans-serif; color: #093f4a;">
              <tr><td style="padding: 0;">
              <![endif]-->
              <table class="main" width="100%" align="center">
                  <tr>
                      <td class="header">
                          <div class="logo-text">ROUTE GUIDE</div>
                      </td>
                  </tr>
                  <tr>
                      <td class="hero">
                          <h1>Booking Confirmed!</h1>
                          <p>We're thrilled to have you! Your stay at <strong>${booking.property?.name || 'our resort'}</strong> is all set.</p>
                      </td>
                  </tr>
                  <tr>
                      <td class="content">
                          <div class="payment-status">
                              <span class="badge ${isPartial ? 'badge-partial' : 'badge-full'}">
                                  ${isPartial ? 'Partial Payment Received' : 'Fully Paid & Confirmed'}
                              </span>
                          </div>

                          <div class="details-box">
                              <table class="detail-table">
                                  <tr>
                                      <td class="label">Reservation #</td>
                                      <td class="value">${booking.bookingNumber}</td>
                                  </tr>
                                  <tr>
                                      <td class="label">Guest Name</td>
                                      <td class="value">${booking.user?.firstName} ${booking.user?.lastName}</td>
                                  </tr>
                                  <tr>
                                      <td class="label">Room Type</td>
                                      <td class="value">${booking.roomType?.name}</td>
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

                          <div class="amount-info">
                              <div class="total-label">${isPartial ? 'Total Booking Amount' : 'Amount Paid'}</div>
                              <div class="total-amount">₹${totalAmount.toLocaleString('en-IN')}</div>
                              ${isPartial ? `
                                <div style="color: #62a1b1; font-size: 13px; margin-top: 5px;">Paid: ₹${paidAmount.toLocaleString('en-IN')}</div>
                                <div class="balance-text">Remaining Balance: ₹${balance.toLocaleString('en-IN')}</div>
                              ` : ''}
                          </div>

                          <div class="btn-wrapper">
                              <a href="${this.configService.get('FRONTEND_URL')}/bookings/${booking.id}" class="btn">View Reservation Details</a>
                          </div>
                      </td>
                  </tr>
                  <tr>
                      <td class="footer">
                          <p style="margin-bottom: 8px;">Questions? We're here to help.</p>
                          <p>© ${new Date().getFullYear()} Route Guide Hospitality. All rights reserved.</p>
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
        console.log(`[MailService] Sending PREMIUM email to property ${propertyEmail} for booking ${booking.bookingNumber}`);
        const from = this.configService.get('EMAIL_FROM');
        const subject = `🚀 New Booking Received - ${booking.bookingNumber} at ${booking.property?.name}`;

        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        const isPartial = booking.paymentStatus === 'PARTIAL';
        const paidAmount = Number(booking.paidAmount || 0);
        const totalAmount = Number(booking.totalAmount);

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { margin: 0; padding: 0; background-color: #f1f8fa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
              .wrapper { width: 100%; table-layout: fixed; background-color: #f1f8fa; padding-bottom: 40px; }
              .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #093f4a; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 20px rgba(9, 63, 74, 0.05); }
              .header { background-color: #093f4a; padding: 30px 20px; text-align: center; }
              .logo-text { color: #f1f8fa; font-size: 20px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
              .hero { padding: 35px 40px 15px 40px; text-align: center; }
              .hero h1 { font-size: 24px; margin: 0; color: #227c8a; font-weight: 800; }
              .hero p { font-size: 15px; color: #62a1b1; margin-top: 8px; }
              .content { padding: 0 40px 40px 40px; }
              .details-box { background-color: #f1f8fa; border-radius: 10px; padding: 15px; margin: 25px 0; border: 1px solid #e3f1f4; }
              
              .detail-table { width: 100%; border-spacing: 0; }
              .detail-table td { padding: 10px 0; border-bottom: 1px solid rgba(34, 124, 138, 0.1); }
              .detail-table tr:last-child td { border-bottom: none; }
              
              .label { color: #62a1b1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; width: 40%; }
              .value { color: #093f4a; font-size: 14px; font-weight: 700; text-align: right; }
              
              .payment-info { background: #093f4a; padding: 20px; border-radius: 8px; margin-top: 25px; text-align: center; color: #ffffff; }
              .stat-label { font-size: 11px; color: #95c2ce; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
              .stat-value { font-size: 24px; color: #ffffff; font-weight: 800; margin-top: 5px; display: block; }
              .badge { display: inline-block; padding: 5px 15px; border-radius: 15px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 10px; border: 1px solid rgba(255,255,255,0.2); }
              .badge-full { background-color: #227c8a; color: #ffffff; }
              .badge-partial { background-color: #fbbf24; color: #093f4a; }
              
              .footer { text-align: center; padding: 25px; font-size: 11px; color: #95c2ce; border-top: 1px solid #f1f8fa; }
              .btn-wrapper { text-align: center; margin-top: 30px; }
              .btn { display: inline-block; background-color: #227c8a; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; }
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
                          <div class="logo-text">ROUTE GUIDE</div>
                      </td>
                  </tr>
                  <tr>
                      <td class="hero">
                          <h1>New Booking Received!</h1>
                          <p>Great news! A new reservation has been made for <strong>${booking.property?.name}</strong>.</p>
                      </td>
                  </tr>
                  <tr>
                      <td class="content">
                          <div class="details-box">
                              <table class="detail-table">
                                  <tr>
                                      <td class="label">Reservation #</td>
                                      <td class="value">${booking.bookingNumber}</td>
                                  </tr>
                                  <tr>
                                      <td class="label">Guest Name</td>
                                      <td class="value">${booking.user?.firstName} ${booking.user?.lastName}</td>
                                  </tr>
                                  <tr>
                                      <td class="label">Accommodation</td>
                                      <td class="value">${booking.roomType?.name}</td>
                                  </tr>
                                  <tr>
                                      <td class="label">Dates</td>
                                      <td class="value">${checkIn} - ${checkOut}</td>
                                  </tr>
                                  <tr>
                                      <td class="label">Source</td>
                                      <td class="value">${booking.channelPartnerId ? 'Channel Partner' : 'Direct Booking'}</td>
                                  </tr>
                              </table>
                          </div>
 
                          <div class="payment-info">
                              <div class="stat-label">Total Booking Amount</div>
                              <span class="stat-value">₹${totalAmount.toLocaleString('en-IN')}</span>
                              <div class="badge ${isPartial ? 'badge-partial' : 'badge-full'}">
                                  ${isPartial ? `PARTIAL PAYMENT: ₹${paidAmount.toLocaleString('en-IN')}` : 'FULL PAYMENT RECEIVED'}
                              </div>
                          </div>
 
                          <div class="btn-wrapper">
                              <a href="${this.configService.get('FRONTEND_URL')}/property/bookings/${booking.id}" class="btn">Process Booking</a>
                          </div>
                      </td>
                  </tr>
                  <tr>
                      <td class="footer">
                          <p style="margin-bottom: 5px;">Route Guide Property Management System</p>
                          <p>© ${new Date().getFullYear()} Route Guide. All rights reserved.</p>
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
        console.log(`[MailService] Sending PREMIUM email to Channel Partner ${cpEmail} for booking ${booking.bookingNumber}`);
        const from = this.configService.get('EMAIL_FROM');
        const subject = `💰 New Referral Booking Earned! - ${booking.bookingNumber}`;

        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const commission = Number(booking.cpCommission || 0).toLocaleString('en-IN');
        const totalAmount = Number(booking.totalAmount).toLocaleString('en-IN');

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
              .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; }
              .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #1e293b; border-radius: 16px; overflow: hidden; margin-top: 40px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); }
              .header { background: linear-gradient(135deg, #093f4a 0%, #0c6a75 100%); padding: 40px 20px; text-align: center; }
              .logo { color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 3px; margin: 0; }
              .hero { padding: 40px 40px 20px 40px; text-align: center; }
              .hero h1 { font-size: 32px; margin: 0; color: #0f172a; font-weight: 800; }
              .hero p { font-size: 16px; color: #64748b; margin-top: 10px; }
              .content { padding: 0 40px 40px 40px; }
              
              .earning-card { background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center; border: 1px solid #99f6e4; }
              .earning-label { font-size: 12px; color: #0d9488; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
              .earning-amount { font-size: 42px; color: #0f766e; font-weight: 800; margin-top: 5px; }
              
              .details-box { border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
              .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
              .detail-row:last-child { border-bottom: none; }
              .label { color: #64748b; font-size: 13px; font-weight: 600; width: 40%; }
              .value { color: #1e293b; font-size: 14px; font-weight: 700; text-align: right; width: 60%; }
              
              .footer { text-align: center; padding: 30px; font-size: 12px; color: #94a3b8; background-color: #f8fafc; }
              .btn { display: inline-block; background-color: #093f4a; color: #ffffff !important; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; margin-top: 20px; }
          </style>
      </head>
      <body>
          <div class="wrapper">
              <table class="main" width="100%" align="center">
                  <tr>
                      <td class="header">
                          <div class="logo">ROUTE GUIDE PARTNER</div>
                      </td>
                  </tr>
                  <tr>
                      <td class="hero">
                          <p>Congratulations!</p>
                          <h1>New Commission Earned!</h1>
                      </td>
                  </tr>
                  <tr>
                      <td class="content">
                          <div class="earning-card">
                              <div class="earning-label">Estimated Commission</div>
                              <div class="earning-amount">₹${commission}</div>
                          </div>

                          <div class="details-box">
                              <table width="100%">
                                  <tr>
                                      <td class="label" style="padding: 10px 0;">Booking Number</td>
                                      <td class="value" style="padding: 10px 0; text-align: right;">${booking.bookingNumber}</td>
                                  </tr>
                                  <tr>
                                      <td class="label" style="padding: 10px 0;">Guest Name</td>
                                      <td class="value" style="padding: 10px 0; text-align: right;">${booking.user?.firstName} ${booking.user?.lastName}</td>
                                  </tr>
                                  <tr>
                                      <td class="label" style="padding: 10px 0;">Property</td>
                                      <td class="value" style="padding: 10px 0; text-align: right;">${booking.property?.name}</td>
                                  </tr>
                                  <tr>
                                      <td class="label" style="padding: 10px 0;">Total Amount</td>
                                      <td class="value" style="padding: 10px 0; text-align: right;">₹${totalAmount}</td>
                                  </tr>
                                  <tr>
                                      <td class="label" style="padding: 10px 0;">Check-in / Out</td>
                                      <td class="value" style="padding: 10px 0; text-align: right;">${checkIn} - ${checkOut}</td>
                                  </tr>
                              </table>
                          </div>

                          <div style="text-align: center;">
                              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                                  Your commission has been tracked and will be updated in your wallet once the guest completes their stay.
                              </p>
                              <a href="${this.configService.get('FRONTEND_URL')}/referrals" class="btn">View My Referrals</a>
                          </div>
                      </td>
                  </tr>
                  <tr>
                      <td class="footer">
                          <p>© ${new Date().getFullYear()} Route Guide Hospitality Network. All rights reserved.</p>
                      </td>
                  </tr>
              </table>
          </div>
      </body>
      </html>
    `;

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
}
