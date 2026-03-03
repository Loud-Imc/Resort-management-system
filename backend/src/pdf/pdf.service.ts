import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
const PdfPrinter = require('pdfmake/js/printer');

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private printer: any;

  constructor() {
    const fonts = {
      Roboto: {
        normal: path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Regular.ttf'),
        bold: path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Medium.ttf'),
        italics: path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Italic.ttf'),
        bolditalics: path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-MediumItalic.ttf'),
      },
    };
    const PrinterConstruct = PdfPrinter.default || PdfPrinter;
    this.printer = new PrinterConstruct(fonts);
  }

  async generateBookingConfirmation(booking: any): Promise<Buffer> {
    const property = booking.property || booking.room?.property;
    const roomType = booking.roomType;
    const user = booking.user;

    const docDefinition: any = {
      content: [
        // Header with Logo
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'ROUTE GUIDE', style: 'brandLogo' },
                { text: 'Travel | Discover | Belong', style: 'brandTagline' },
              ],
            },
            {
              width: 'auto',
              stack: [
                { text: 'BOOKING CONFIRMATION', style: 'docTitle' },
                { text: `ID: #${booking.bookingNumber}`, style: 'bookingId' },
                { text: `Date: ${new Date().toLocaleDateString('en-IN')}`, style: 'docDate' },
              ],
              alignment: 'right',
            },
          ],
          margin: [0, 0, 0, 30],
        },

        // Status Banner
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: booking.status === 'CONFIRMED' ? 'RESERVATION CONFIRMED' : booking.status.replace('_', ' '),
                  style: 'statusBanner',
                  fillColor: booking.status === 'CONFIRMED' ? '#227c8a' : '#333333',
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 30],
        },

        // Main info grid
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'GUEST DETAILS', style: 'sectionHeader' },
                { text: `${user.firstName} ${user.lastName || ''}`, style: 'guestName' },
                { text: user.email, style: 'guestInfo' },
                { text: user.phone || 'N/A', style: 'guestInfo' },
                { text: '\n' },
                { text: 'PROPERTY', style: 'sectionHeader' },
                { text: property.name, style: 'propertyName' },
                { text: property.address, style: 'propertyAddress' },
                { text: `${property.city}, ${property.state}`, style: 'propertyAddress' },
              ],
            },
            {
              width: '*',
              stack: [
                { text: 'STAY SUMMARY', style: 'sectionHeader' },
                {
                  table: {
                    widths: ['*', '*'],
                    body: [
                      [
                        { border: [false, false, false, false], text: 'CHECK-IN', style: 'stayLabel' },
                        { border: [false, false, false, false], text: 'CHECK-OUT', style: 'stayLabel' },
                      ],
                      [
                        { border: [false, false, false, false], text: new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), style: 'stayDate' },
                        { border: [false, false, false, false], text: new Date(booking.checkOutDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), style: 'stayDate' },
                      ],
                      [
                        { border: [false, false, false, false], text: '2:00 PM', style: 'stayTime' },
                        { border: [false, false, false, false], text: '11:00 AM', style: 'stayTime' },
                      ],
                    ],
                  },
                },
                { text: '\n' },
                { text: 'ACCOMMODATION', style: 'sectionHeader' },
                { text: roomType.name, style: 'roomName' },
                { text: `${booking.adultsCount} Adults, ${booking.childrenCount} Children`, style: 'guestCount' },
                { text: `${booking.numberOfNights} Night(s)`, style: 'guestCount' },
              ],
            },
          ],
          margin: [0, 0, 0, 40],
        },

        // Payment Table
        { text: 'PAYMENT SUMMARY', style: 'sectionHeader', margin: [0, 0, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto'],
            body: [
              [
                { text: 'Description', style: 'tableHeader' },
                { text: 'Amount', style: 'tableHeader', alignment: 'right' },
              ],
              [
                { text: 'Booking Charges', style: 'tableCell' },
                { text: `₹${Number(booking.baseAmount || 0).toLocaleString()}`, style: 'tableCell', alignment: 'right' },
              ],
              [
                { text: 'Taxes & Service Fees', style: 'tableCell' },
                { text: `₹${Number(booking.taxAmount || 0).toLocaleString()}`, style: 'tableCell', alignment: 'right' },
              ],
              ...(booking.couponDiscountAmount > 0 ? [[
                { text: `Discount (${booking.couponCode || 'PROMO'})`, style: 'tableCell', color: '#22c55e' },
                { text: `-₹${Number(booking.couponDiscountAmount).toLocaleString()}`, style: 'tableCell', alignment: 'right', color: '#22c55e' },
              ]] : []),
              [
                { text: 'Total Net Amount', style: 'tableTotalLabel' },
                { text: `₹${Number(booking.totalAmount).toLocaleString()}`, style: 'tableTotalValue', alignment: 'right' },
              ],
              [
                { text: 'Total Amount Paid', style: 'tablePaidLabel' },
                { text: `₹${Number(booking.paidAmount).toLocaleString()}`, style: 'tablePaidValue', alignment: 'right' },
              ],
              [
                { text: 'Remaining Balance (Due at Check-in)', style: 'tableBalanceLabel' },
                { text: `₹${(Number(booking.totalAmount) - Number(booking.paidAmount)).toLocaleString()}`, style: 'tableBalanceValue', alignment: 'right' },
              ],
            ],
          },
          layout: {
            hLineWidth: (i) => (i === 0 || i === 1 || i >= 4) ? 0.5 : 0,
            vLineWidth: () => 0,
            hLineColor: () => '#e2e8f0',
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
          margin: [0, 0, 0, 40],
        },

        // QR and Notes
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'IMPORTANT INFORMATION', style: 'infoTitle' },
                {
                  ul: [
                    'Please carry a valid photo ID for all guests.',
                    'Standard check-in is 2 PM. Early check-in is subject to availability.',
                    'Cancellation policy applies as per the selected rate plan.',
                    'For any assistance, contact the resort at ' + (property.phone || '+91-XXXXXXXXXX'),
                  ],
                  style: 'infoList',
                },
              ],
            },
            {
              width: 100,
              qr: `${process.env.FRONTEND_URL || 'https://routeguide.in'}/confirmation?bookingId=${booking.id}`,
              fit: 80,
              alignment: 'right',
            },
          ],
        },
        { text: 'Scan to verify booking', style: 'qrLabel', alignment: 'right', margin: [0, 5, 0, 0] },
      ],

      footer: (currentPage: number, pageCount: number) => {
        return {
          text: `Page ${currentPage} of ${pageCount} | Route Guide - Luxury Reimagined`,
          style: 'footerText',
          alignment: 'center',
          margin: [0, 10, 0, 0],
        };
      },

      styles: {
        brandLogo: { fontSize: 28, bold: true, color: '#227c8a', letterSpacing: 2 },
        brandTagline: { fontSize: 9, color: '#64748b', margin: [0, -5, 0, 0] },
        docTitle: { fontSize: 16, bold: true, color: '#0f172a' },
        bookingId: { fontSize: 12, bold: true, color: '#227c8a', margin: [0, 2, 0, 0] },
        docDate: { fontSize: 9, color: '#64748b' },
        statusBanner: { color: 'white', fontSize: 14, bold: true, alignment: 'center', margin: [0, 8, 0, 8] },
        sectionHeader: { fontSize: 10, bold: true, color: '#64748b', letterSpacing: 1, margin: [0, 0, 0, 8] },
        guestName: { fontSize: 14, bold: true, color: '#0f172a' },
        guestInfo: { fontSize: 10, color: '#475569' },
        propertyName: { fontSize: 14, bold: true, color: '#0f172a' },
        propertyAddress: { fontSize: 10, color: '#475569' },
        roomName: { fontSize: 12, bold: true, color: '#0f172a' },
        guestCount: { fontSize: 10, color: '#475569' },
        stayLabel: { fontSize: 9, color: '#94a3b8', bold: true },
        stayDate: { fontSize: 11, bold: true, color: '#0f172a' },
        stayTime: { fontSize: 9, color: '#64748b' },
        tableHeader: { fontSize: 10, bold: true, color: '#475569', margin: [0, 5, 0, 5] },
        tableCell: { fontSize: 10, color: '#1e293b' },
        tableTotalLabel: { fontSize: 11, bold: true, color: '#0f172a', margin: [0, 5, 0, 5] },
        tableTotalValue: { fontSize: 12, bold: true, color: '#0f172a', margin: [0, 5, 0, 5] },
        tablePaidLabel: { fontSize: 10, bold: true, color: '#059669' },
        tablePaidValue: { fontSize: 11, bold: true, color: '#059669' },
        tableBalanceLabel: { fontSize: 10, bold: true, color: '#d97706' },
        tableBalanceValue: { fontSize: 11, bold: true, color: '#d97706' },
        infoTitle: { fontSize: 11, bold: true, color: '#0f172a', margin: [0, 0, 0, 10] },
        infoList: { fontSize: 9, color: '#475569', lineHeight: 1.4 },
        qrLabel: { fontSize: 8, color: '#94a3b8', italic: true },
        footerText: { fontSize: 8, color: '#cbd5e1' },
      },
      defaultStyle: { font: 'Roboto' },
    };

    return new Promise(async (resolve, reject) => {
      try {
        const pdfDoc = await this.printer.createPdfKitDocument(docDefinition);
        const chunks: any[] = [];
        pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: any) => reject(err));
        pdfDoc.end();
      } catch (error) {
        this.logger.error(`Error creating PDF document: ${error.message}`, error.stack);
        reject(error);
      }
    });
  }
}
