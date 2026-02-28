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

    async sendBookingConfirmation(booking: any) {
        console.log(`[MailService] Sending PREMIUM booking confirmation to ${booking.user.email}`);
        const from = this.configService.get('EMAIL_FROM');
        const to = booking.user.email;
        const subject = `Booking Confirmation - ${booking.bookingNumber}`;

        const checkIn = new Date(booking.checkInDate).toLocaleDateString();
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString();

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
               .header { background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 50px 20px; text-align: center; color: white; border-bottom: 4px solid #fbbf24; }
              .content { padding: 40px; color: #334155; line-height: 1.6; }
              .card { background-color: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0; }
              .button { display: inline-block; padding: 14px 30px; background-color: #0f172a; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
              .footer { background-color: #f1f5f9; padding: 25px; text-align: center; font-size: 13px; color: #64748b; }
              .booking-id { font-family: monospace; font-size: 18px; font-weight: bold; color: #0f172a; }
              .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px; }
              .detail-label { font-weight: 600; color: #64748b; font-size: 12px; uppercase; }
              .detail-value { font-weight: 700; color: #0f172a; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1 style="margin: 0; font-size: 28px; letter-spacing: 2px;">ROUTE GUIDE</h1>
                   <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">✨ NEW PREMIUM TEMPLATE v3.0 ✨</p>
              </div>
              <div class="content">
                  <h2 style="color: #0f172a; margin-top: 0;">Warm greetings, ${booking.user.firstName}!</h2>
                  <p>Your sanctuary is ready. We've successfully confirmed your reservation and our team is already preparing for your arrival.</p>
                  
                  <div class="card">
                      <div style="text-align: center; margin-bottom: 20px;">
                          <span class="detail-label">Reservation Number</span><br/>
                          <span class="booking-id">#${booking.bookingNumber}</span>
                      </div>
                      
                      <div class="detail-row">
                          <span class="detail-label">Property</span>
                          <span class="detail-value">${booking.property?.name || 'Our Resort'}</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Accommodation</span>
                          <span class="detail-value">${booking.roomType.name}</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Check-in</span>
                          <span class="detail-value">${checkIn}</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Check-out</span>
                          <span class="detail-value">${checkOut}</span>
                      </div>
                      <div class="detail-row" style="border: none; margin-top: 15px;">
                          <span class="detail-label" style="color: #0f172a; font-size: 14px;">Total Paid</span>
                          <span class="detail-value" style="color: #059669; font-size: 20px;">₹${booking.totalAmount}</span>
                      </div>
                  </div>

                  <div style="text-align: center;">
                      <a href="#" class="button">Manage My Booking</a>
                  </div>
              </div>
              <div class="footer">
                  <p style="margin: 0;">Questions? Contact our concierge at support@routeguide.com</p>
                  <p style="margin: 10px 0 0 0;">&copy; ${new Date().getFullYear()} Route Guide Hospitality. All rights reserved.</p>
              </div>
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
            console.log(`[MailService] Confirmation sent to ${to} for ${booking.bookingNumber}`);
        } catch (error) {
            console.error('[MailService] Error sending email:', error);
        }
    }

    async sendPropertyNewBookingAlert(propertyEmail: string, booking: any) {
        console.log(`[MailService] Sending email to property ${propertyEmail} for booking ${booking.bookingNumber}`);
        const from = this.configService.get('EMAIL_FROM');
        const subject = `🚀 New Booking Received - ${booking.bookingNumber}`;

        const checkIn = new Date(booking.checkInDate).toLocaleDateString();
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString();

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
              .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px; text-align: center; color: white; }
              .content { padding: 40px; color: #334155; line-height: 1.6; }
              .card { background-color: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0; }
              .footer { background-color: #f1f5f9; padding: 25px; text-align: center; font-size: 13px; color: #64748b; }
              .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px; }
              .detail-label { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }
              .detail-value { font-weight: 700; color: #0f172a; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">New Booking Notification</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Great news! You have a new reservation.</p>
              </div>
              <div class="content">
                  <h2 style="color: #0f172a; margin-top: 0;">Reservation #${booking.bookingNumber}</h2>
                  
                  <div class="card">
                      <div class="detail-row">
                          <span class="detail-label">Guest Name</span>
                          <span class="detail-value">${booking.user?.firstName} ${booking.user?.lastName}</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Accommodation</span>
                          <span class="detail-value">${booking.roomType?.name}</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Dates</span>
                          <span class="detail-value">${checkIn} - ${checkOut}</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Total Amount</span>
                          <span class="detail-value">₹${booking.totalAmount}</span>
                      </div>
                      <div class="detail-row" style="border: none;">
                          <span class="detail-label">Source</span>
                          <span class="detail-value">${booking.channelPartnerId ? 'Channel Partner' : 'Direct Website'}</span>
                      </div>
                  </div>

                  <p>Please log in to your dashboard to view full guest details and manage this booking.</p>
              </div>
              <div class="footer">
                  <p style="margin: 0;">Route Guide Property Management System</p>
                  <p style="margin: 10px 0 0 0;">&copy; ${new Date().getFullYear()} Route Guide. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;

        try {
            await this.transporter.sendMail({ from, to: propertyEmail, subject, html });
        } catch (error) {
            console.error('[MailService] Error sending property alert:', error);
        }
    }
}
