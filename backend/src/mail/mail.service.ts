import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            pool: true,
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

    async sendBalancePaymentReminder(booking: any) {
        console.log(`[MailService] Sending balance reminder to ${booking.user.email}`);
        const from = this.configService.get('EMAIL_FROM');
        const to = booking.user.email;
        const subject = `Action Required: Balance Payment for your stay at ${booking.property?.name}`;

        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const paidAmount = Number(booking.paidAmount || 0);
        const totalAmount = Number(booking.totalAmount);
        const balance = totalAmount - paidAmount;
        const frontendUrl = this.configService.get('PUBLIC_URL') || this.configService.get('FRONTEND_URL');
        const paymentLink = `${frontendUrl}/confirmation?bookingId=${booking.id}`;

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
              .hero h1 { font-size: 28px; margin: 0; color: #e11d48; font-weight: 800; }
              .hero p { font-size: 16px; color: #62a1b1; margin-top: 10px; }
              .content { padding: 0 40px 40px 40px; }
              .details-box { background-color: #f1f8fa; border-radius: 12px; padding: 20px; margin: 30px 0; border: 1px solid #e3f1f4; }
              
              .detail-table { width: 100%; border-spacing: 0; }
              .detail-table td { padding: 12px 0; border-bottom: 1px solid rgba(34, 124, 138, 0.1); }
              .detail-table tr:last-child td { border-bottom: none; }
              
              .label { color: #62a1b1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 40%; }
              .value { color: #093f4a; font-size: 15px; font-weight: 700; text-align: right; }
              
              .amount-info { margin-top: 30px; text-align: center; background: #fff1f2; padding: 25px; border-radius: 12px; border: 1px solid #fecdd3; }
              .total-label { font-size: 14px; color: #e11d48; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
              .total-amount { font-size: 36px; color: #e11d48; font-weight: 800; margin-top: 5px; }
              
              .footer { text-align: center; padding: 30px 20px; font-size: 12px; color: #95c2ce; border-top: 1px solid #f1f8fa; }
              .btn-wrapper { text-align: center; margin-top: 35px; }
              .btn { display: inline-block; background-color: #e11d48; color: #ffffff !important; padding: 18px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.2); }
          </style>
      </head>
      <body>
          <div class="wrapper">
              <table class="main" width="100%" align="center">
                  <tr>
                      <td class="header">
                          <div class="logo-text">ROUTE GUIDE</div>
                      </td>
                  </tr>
                  <tr>
                      <td class="hero">
                          <h1>Pending Balance Reminder</h1>
                          <p>Your stay at <strong>${booking.property?.name}</strong> starts tomorrow! Please complete your balance payment to ensure a smooth check-in.</p>
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
 
                          <div class="amount-info">
                              <div class="total-label">Balance Due</div>
                              <div class="total-amount">₹${balance.toLocaleString('en-IN')}</div>
                          </div>
 
                          <div class="btn-wrapper">
                              <a href="${paymentLink}" class="btn">Pay Balance Now</a>
                          </div>
                      </td>
                  </tr>
                  <tr>
                      <td class="footer">
                          <p style="margin-bottom: 8px;">If you have already paid, please ignore this message.</p>
                          <p>© ${new Date().getFullYear()} Route Guide Hospitality. All rights reserved.</p>
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
        const from = this.configService.get('EMAIL_FROM');
        const to = booking.user?.email;
        if (!to) return;

        const subject = `Booking Cancelled - ${booking.bookingNumber} at ${booking.property?.name || 'Route Guide'}`;
        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const cancelledAt = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } as any);
        const paidAmount = Number(booking.paidAmount || 0);
        const refundAmount = Number(booking.refundAmount || 0);
        const hasRefund = refundAmount > 0;

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { margin: 0; padding: 0; background-color: #f1f8fa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
              .wrapper { width: 100%; table-layout: fixed; background-color: #f1f8fa; padding-bottom: 40px; }
              .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #093f4a; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 20px rgba(9, 63, 74, 0.05); }
              .header { background-color: #374151; padding: 40px 20px; text-align: center; }
              .logo-text { color: #f9fafb; font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
              .hero { padding: 40px 40px 20px 40px; text-align: center; }
              .hero h1 { font-size: 26px; margin: 0; color: #374151; font-weight: 800; }
              .hero p { font-size: 15px; color: #6b7280; margin-top: 10px; }
              .content { padding: 0 40px 40px 40px; }
              .details-box { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #e5e7eb; }
              .detail-table { width: 100%; border-spacing: 0; }
              .detail-table td { padding: 11px 0; border-bottom: 1px solid #f3f4f6; }
              .detail-table tr:last-child td { border-bottom: none; }
              .label { color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 40%; }
              .value { color: #111827; font-size: 14px; font-weight: 700; text-align: right; }
              .refund-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 20px; margin-top: 20px; text-align: center; }
              .refund-label { font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 1px; }
              .refund-amount { font-size: 30px; font-weight: 800; color: #047857; margin-top: 5px; }
              .refund-note { font-size: 12px; color: #6b7280; margin-top: 8px; }
              .no-refund-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 15px; margin-top: 20px; text-align: center; font-size: 13px; color: #92400e; }
              .footer { text-align: center; padding: 30px 20px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
          </style>
      </head>
      <body>
          <div class="wrapper">
              <table class="main" width="100%" align="center">
                  <tr><td class="header"><div class="logo-text">ROUTE GUIDE</div></td></tr>
                  <tr>
                      <td class="hero">
                          <h1>Booking Cancelled</h1>
                          <p>Your booking at <strong>${booking.property?.name || 'our property'}</strong> has been successfully cancelled.</p>
                      </td>
                  </tr>
                  <tr>
                      <td class="content">
                          <div class="details-box">
                              <table class="detail-table">
                                  <tr><td class="label">Booking #</td><td class="value">${booking.bookingNumber}</td></tr>
                                  <tr><td class="label">Guest</td><td class="value">${booking.user?.firstName} ${booking.user?.lastName}</td></tr>
                                  <tr><td class="label">Property</td><td class="value">${booking.property?.name || '—'}</td></tr>
                                  <tr><td class="label">Room Type</td><td class="value">${booking.roomType?.name || '—'}</td></tr>
                                  <tr><td class="label">Check-In</td><td class="value">${checkIn}</td></tr>
                                  <tr><td class="label">Check-Out</td><td class="value">${checkOut}</td></tr>
                                  <tr><td class="label">Amount Paid</td><td class="value">₹${paidAmount.toLocaleString('en-IN')}</td></tr>
                                  <tr><td class="label">Cancelled On</td><td class="value">${cancelledAt}</td></tr>
                              </table>
                          </div>
                          ${hasRefund ? `
                          <div class="refund-box">
                              <div class="refund-label">Refund Initiated</div>
                              <div class="refund-amount">₹${refundAmount.toLocaleString('en-IN')}</div>
                              <div class="refund-note">Your refund will be credited to the original payment method within 5–7 business days.</div>
                          </div>
                          ` : paidAmount > 0 ? `
                          <div class="no-refund-box">
                              ⚠️ Based on the cancellation policy, this booking is not eligible for a refund.
                          </div>
                          ` : ''}
                      </td>
                  </tr>
                  <tr><td class="footer"><p>© ${new Date().getFullYear()} Route Guide Hospitality. All rights reserved.</p></td></tr>
              </table>
          </div>
      </body>
      </html>
    `;

        try {
            await this.transporter.sendMail({ from, to, subject, html });
            console.log(`[MailService] Cancellation confirmation sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending cancellation confirmation:', error);
        }
    }

    async sendRefundReceipt(booking: any, refundAmount: number, refundMode: string = 'Original Payment Method') {
        const from = this.configService.get('EMAIL_FROM');
        const to = booking.user?.email;
        if (!to) return;

        const subject = `Refund Processed - ₹${refundAmount.toLocaleString('en-IN')} for Booking ${booking.bookingNumber}`;
        const processedAt = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } as any);

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { margin: 0; padding: 0; background-color: #f0fdf4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
              .wrapper { width: 100%; table-layout: fixed; background-color: #f0fdf4; padding-bottom: 40px; }
              .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #064e3b; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
              .header { background: linear-gradient(135deg, #047857, #059669); padding: 40px 20px; text-align: center; }
              .logo-text { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
              .hero { padding: 40px 40px 20px 40px; text-align: center; }
              .hero h1 { font-size: 26px; margin: 0; color: #065f46; font-weight: 800; }
              .hero p { font-size: 15px; color: #6b7280; margin-top: 10px; }
              .amount-card { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 12px; padding: 30px; margin: 20px 40px; text-align: center; border: 1px solid #a7f3d0; }
              .amount-label { font-size: 12px; color: #059669; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
              .amount-value { font-size: 40px; color: #047857; font-weight: 800; margin-top: 8px; }
              .content { padding: 0 40px 40px 40px; }
              .details-box { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; }
              .detail-table { width: 100%; border-spacing: 0; }
              .detail-table td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
              .detail-table tr:last-child td { border-bottom: none; }
              .label { color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 40%; }
              .value { color: #111827; font-size: 14px; font-weight: 700; text-align: right; }
              .note { font-size: 12px; color: #6b7280; text-align: center; padding: 0 40px 30px 40px; line-height: 1.6; }
              .footer { text-align: center; padding: 25px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; background: #f9fafb; }
          </style>
      </head>
      <body>
          <div class="wrapper">
              <table class="main" width="100%" align="center">
                  <tr><td class="header"><div class="logo-text">ROUTE GUIDE</div></td></tr>
                  <tr>
                      <td class="hero">
                          <h1>Refund Processed ✅</h1>
                          <p>Your refund for booking <strong>${booking.bookingNumber}</strong> has been initiated.</p>
                      </td>
                  </tr>
                  <tr>
                      <td>
                          <div class="amount-card">
                              <div class="amount-label">Refund Amount</div>
                              <div class="amount-value">₹${refundAmount.toLocaleString('en-IN')}</div>
                          </div>
                      </td>
                  </tr>
                  <tr>
                      <td class="content">
                          <div class="details-box">
                              <table class="detail-table">
                                  <tr><td class="label">Booking #</td><td class="value">${booking.bookingNumber}</td></tr>
                                  <tr><td class="label">Property</td><td class="value">${booking.property?.name || '—'}</td></tr>
                                  <tr><td class="label">Refund Amount</td><td class="value">₹${refundAmount.toLocaleString('en-IN')}</td></tr>
                                  <tr><td class="label">Refund To</td><td class="value">${refundMode}</td></tr>
                                  <tr><td class="label">Processed On</td><td class="value">${processedAt}</td></tr>
                              </table>
                          </div>
                      </td>
                  </tr>
                  <tr>
                      <td class="note">
                          Please allow 5–7 business days for the refund to reflect in your account. If you have any questions, please contact our support team.
                      </td>
                  </tr>
                  <tr><td class="footer"><p>© ${new Date().getFullYear()} Route Guide Hospitality. All rights reserved.</p></td></tr>
              </table>
          </div>
      </body>
      </html>
    `;

        try {
            await this.transporter.sendMail({ from, to, subject, html });
            console.log(`[MailService] Refund receipt sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending refund receipt:', error);
        }
    }

    async sendCheckInReminderEmail(booking: any) {
        const from = this.configService.get('EMAIL_FROM');
        const to = booking.user?.email;
        if (!to) return;

        const subject = `Reminder: Your stay at ${booking.property?.name} starts tomorrow!`;
        const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { margin: 0; padding: 0; background-color: #f0f9ff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
              .wrapper { width: 100%; table-layout: fixed; background-color: #f0f9ff; padding-bottom: 40px; }
              .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
              .header { background: linear-gradient(135deg, #0369a1, #0284c7); padding: 40px 20px; text-align: center; }
              .logo-text { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
              .hero { padding: 40px 40px 20px 40px; text-align: center; }
              .hero h1 { font-size: 26px; margin: 0; color: #0c4a6e; font-weight: 800; }
              .hero p { font-size: 15px; color: #6b7280; margin-top: 10px; }
              .content { padding: 0 40px 40px 40px; }
              .details-box { background-color: #f0f9ff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #bae6fd; }
              .detail-table { width: 100%; border-spacing: 0; }
              .detail-table td { padding: 11px 0; border-bottom: 1px solid #e0f2fe; }
              .detail-table tr:last-child td { border-bottom: none; }
              .label { color: #7dd3fc; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; width: 40%; }
              .value { color: #0c4a6e; font-size: 14px; font-weight: 700; text-align: right; }
              .checklist { background: #f9fafb; border-radius: 10px; padding: 20px; margin-top: 20px; border: 1px solid #e5e7eb; }
              .checklist h3 { font-size: 13px; color: #374151; font-weight: 700; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px; }
              .checklist ul { margin: 0; padding-left: 18px; }
              .checklist li { font-size: 13px; color: #4b5563; margin-bottom: 8px; line-height: 1.5; }
              .btn-wrapper { text-align: center; margin-top: 30px; }
              .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 15px 35px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; }
              .footer { text-align: center; padding: 25px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
          </style>
      </head>
      <body>
          <div class="wrapper">
              <table class="main" width="100%" align="center">
                  <tr><td class="header"><div class="logo-text">ROUTE GUIDE</div></td></tr>
                  <tr>
                      <td class="hero">
                          <h1>🏨 See You Tomorrow!</h1>
                          <p>We're excited to welcome you at <strong>${booking.property?.name}</strong>. Your stay begins tomorrow!</p>
                      </td>
                  </tr>
                  <tr>
                      <td class="content">
                          <div class="details-box">
                              <table class="detail-table">
                                  <tr><td class="label">Booking #</td><td class="value">${booking.bookingNumber}</td></tr>
                                  <tr><td class="label">Guest</td><td class="value">${booking.user?.firstName} ${booking.user?.lastName}</td></tr>
                                  <tr><td class="label">Property</td><td class="value">${booking.property?.name}</td></tr>
                                  <tr><td class="label">Room Type</td><td class="value">${booking.roomType?.name || '—'}</td></tr>
                                  <tr><td class="label">Check-In</td><td class="value">${checkIn}</td></tr>
                                  <tr><td class="label">Check-Out</td><td class="value">${checkOut}</td></tr>
                                  <tr><td class="label">Check-In Time</td><td class="value">2:00 PM onwards</td></tr>
                              </table>
                          </div>
                          <div class="checklist">
                              <h3>Before You Arrive</h3>
                              <ul>
                                  <li>Carry a valid photo ID for all guests at check-in.</li>
                                  <li>Early check-in is subject to availability. Contact the property to arrange.</li>
                                  <li>If you have any special requests, please inform the property in advance.</li>
                                  ${booking.paymentStatus === 'PARTIAL' ? `<li>⚠️ Please ensure your balance payment is completed before check-in.</li>` : ''}
                              </ul>
                          </div>
                          <div class="btn-wrapper">
                              <a href="${this.configService.get('PUBLIC_URL') || this.configService.get('FRONTEND_URL')}/bookings/${booking.id}" class="btn">View Booking Details</a>
                          </div>
                      </td>
                  </tr>
                  <tr><td class="footer"><p>© ${new Date().getFullYear()} Route Guide Hospitality. All rights reserved.</p></td></tr>
              </table>
          </div>
      </body>
      </html>
    `;

        try {
            await this.transporter.sendMail({ from, to, subject, html });
            console.log(`[MailService] Check-in reminder sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending check-in reminder:', error);
        }
    }

    async sendReviewRequestEmail(booking: any) {
        const from = this.configService.get('EMAIL_FROM');
        const to = booking.user?.email;
        if (!to) return;

        const frontendUrl = this.configService.get('PUBLIC_URL') || this.configService.get('FRONTEND_URL');
        const reviewLink = `${frontendUrl}/properties/${booking.propertyId}?review=true&bookingId=${booking.id}`;
        const subject = `How was your stay at ${booking.property?.name}? ⭐`;

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { margin: 0; padding: 0; background-color: #fffbeb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
              .wrapper { width: 100%; table-layout: fixed; background-color: #fffbeb; padding-bottom: 40px; }
              .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; border-radius: 12px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
              .header { background: linear-gradient(135deg, #d97706, #f59e0b); padding: 40px 20px; text-align: center; }
              .logo-text { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
              .hero { padding: 40px 40px 20px 40px; text-align: center; }
              .stars { font-size: 32px; letter-spacing: 4px; }
              .hero h1 { font-size: 26px; margin: 15px 0 0 0; color: #78350f; font-weight: 800; }
              .hero p { font-size: 15px; color: #6b7280; margin-top: 10px; line-height: 1.6; }
              .content { padding: 0 40px 40px 40px; }
              .stay-card { background: #fffbeb; border-radius: 10px; padding: 20px; margin: 20px 0; border: 1px solid #fde68a; text-align: center; }
              .stay-prop { font-size: 18px; font-weight: 800; color: #78350f; }
              .stay-dates { font-size: 13px; color: #92400e; margin-top: 5px; }
              .btn-wrapper { text-align: center; margin-top: 30px; }
              .btn { display: inline-block; background: linear-gradient(135deg, #d97706, #f59e0b); color: #ffffff !important; padding: 18px 45px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 16px; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3); }
              .footer { text-align: center; padding: 25px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
              .opt-out { font-size: 11px; color: #d1d5db; margin-top: 8px; }
          </style>
      </head>
      <body>
          <div class="wrapper">
              <table class="main" width="100%" align="center">
                  <tr><td class="header"><div class="logo-text">ROUTE GUIDE</div></td></tr>
                  <tr>
                      <td class="hero">
                          <div class="stars">⭐⭐⭐⭐⭐</div>
                          <h1>How Was Your Stay?</h1>
                          <p>Hi ${booking.user?.firstName}, we'd love to hear about your experience. Your review helps other travellers and supports our partner properties.</p>
                      </td>
                  </tr>
                  <tr>
                      <td class="content">
                          <div class="stay-card">
                              <div class="stay-prop">${booking.property?.name}</div>
                              <div class="stay-dates">Booking #${booking.bookingNumber} · ${new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          </div>
                          <div class="btn-wrapper">
                              <a href="${reviewLink}" class="btn">✍️ Write My Review</a>
                          </div>
                          <p style="text-align:center; font-size: 12px; color: #9ca3af; margin-top: 20px;">It only takes a minute! Your honest feedback is greatly appreciated.</p>
                      </td>
                  </tr>
                  <tr><td class="footer"><p>© ${new Date().getFullYear()} Route Guide Hospitality. All rights reserved.</p><p class="opt-out">You received this because you stayed with us. We only send this once per stay.</p></td></tr>
              </table>
          </div>
      </body>
      </html>
    `;

        try {
            await this.transporter.sendMail({ from, to, subject, html });
            console.log(`[MailService] Review request sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending review request:', error);
        }
    }
}
