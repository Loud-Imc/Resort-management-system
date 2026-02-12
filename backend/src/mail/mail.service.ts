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
        const from = this.configService.get('EMAIL_FROM');
        const to = booking.user.email;
        const subject = `Booking Confirmation - ${booking.bookingNumber}`;

        const checkIn = new Date(booking.checkInDate).toLocaleDateString();
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString();

        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0f172a; text-align: center;">Booking Confirmed!</h2>
        <p>Dear ${booking.user.firstName},</p>
        <p>Thank you for choosing our resort. Your booking is confirmed and we look forward to welcoming you.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Reservation Details</h3>
          <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
          <p><strong>Room Type:</strong> ${booking.roomType.name}</p>
          <p><strong>Check-in:</strong> ${checkIn}</p>
          <p><strong>Check-out:</strong> ${checkOut}</p>
          <p><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
        </div>

        <p>If you have any questions, please feel free to contact us.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">
          This is an automated message, please do not reply directly to this email.
        </p>
      </div>
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
}
