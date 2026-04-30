import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
const PdfPrinter = require('pdfmake');

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private pdfmakeManager: any;

  constructor() {
    // Better path resolution relative to this file
    const fontsPath = path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto');
    
    const fonts = {
      Roboto: {
        normal: path.join(fontsPath, 'Roboto-Regular.ttf'),
        bold: path.join(fontsPath, 'Roboto-Medium.ttf'),
        italics: path.join(fontsPath, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsPath, 'Roboto-MediumItalic.ttf'),
      },
    };
    
    this.pdfmakeManager = PdfPrinter;
    this.pdfmakeManager.setFonts(fonts);

    // Set URL access policy for pdfmake 0.3.x to allow base64 images
    try {
      this.pdfmakeManager.setUrlAccessPolicy((url: string) => {
        return url.startsWith('data:');
      });
    } catch (e) {
      this.logger.warn(`Failed to set URL access policy: ${e.message}`);
    }
  }

  private getLogoBase64(): string | null {
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'assets', 'Route-guide.png'),
      path.join(process.cwd(), 'dist', 'assets', 'Route-guide.png'),
      path.join(__dirname, '..', 'assets', 'Route-guide.png')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          return fs.readFileSync(p).toString('base64');
        } catch (e) {
          this.logger.error(`Error reading logo at ${p}: ${e.message}`);
        }
      }
    }
    return null;
  }

  async generateBookingConfirmation(booking: any, recipientType: 'GUEST' | 'PARTNER' = 'GUEST'): Promise<Buffer> {
    console.log(`[PdfService] [DEBUG] Incoming Booking Data:`, JSON.stringify(booking, null, 2));
    console.log(`[PdfService] [DEBUG] Recipient Type: ${recipientType}`);

    const property = booking.property || booking.room?.property;
    const roomType = booking.roomType;
    const user = booking.user;

    console.log(`[PdfService] [DEBUG] Extracted Property:`, property?.name);
    console.log(`[PdfService] [DEBUG] Extracted RoomType:`, roomType?.name);
    console.log(`[PdfService] [DEBUG] Extracted User:`, user?.firstName);

    const isPartner = recipientType === 'PARTNER';

    if (!property) console.error(`[PdfService] [ERROR] property is undefined for booking ${booking.bookingNumber}`);
    if (!roomType) console.error(`[PdfService] [ERROR] roomType is undefined for booking ${booking.bookingNumber}`);
    if (!user) console.error(`[PdfService] [ERROR] user is undefined for booking ${booking.bookingNumber}`);

    // Calculation Logic for Invoices
    const totalAmount = Number(booking.totalAmount || 0);
    const cpCommission = Number(booking.cpCommission || 0);
    const cpDiscount = Number(booking.cpDiscount || 0);
    const offerDiscountAmount = Number(booking.offerDiscountAmount || 0);
    const couponDiscountAmount = Number(booking.couponDiscountAmount || 0);
    const paidAmount = Number(booking.paidAmount || 0);
    const netInvestment = totalAmount - cpCommission;

    console.log(`[PdfService] [DEBUG] Values - Total: ${totalAmount}, Commission: ${cpCommission}, Net: ${netInvestment}`);

    const docDefinition: any = {
      content: [
        // Header with Logo
        {
          columns: [
            {
              width: '*',
              stack: [
                (() => {
                  const logoBase64 = this.getLogoBase64();
                  if (logoBase64) {
                    return {
                      image: `data:image/png;base64,${logoBase64}`,
                      width: 120
                    };
                  }
                  return { text: 'Route Guide', style: 'brandLogo' };
                })(),
                { text: 'Travel | Discover | Belong', style: 'brandTagline', margin: [0, 5, 0, 0] },
              ],
            },
            {
              width: 'auto',
              stack: [
                { text: isPartner ? 'AGENCY INVOICE' : 'BOOKING CONFIRMATION', style: 'docTitle' },
                { text: `ID: #${booking.bookingNumber || 'N/A'}`, style: 'bookingId' },
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
                  text: (booking.status || 'PENDING').replace('_', ' '),
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
                { text: `${user?.firstName || 'Guest'} ${user?.lastName || ''}`, style: 'guestName' },
                { text: user?.email || 'N/A', style: 'guestInfo' },
                { text: user?.phone || 'N/A', style: 'guestInfo' },
                ...(booking.gstNumber ? [{ text: `GST: ${booking.gstNumber}`, style: 'guestInfo' }] : []),
                { text: '\n' },
                { text: 'PROPERTY', style: 'sectionHeader' },
                { text: property?.name || 'Property Name', style: 'propertyName' },
                { text: property?.address || 'Address not available', style: 'propertyAddress' },
                { text: `${property?.city || ''}, ${property?.state || ''}`, style: 'propertyAddress' },
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
                        { border: [false, false, false, false], text: booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A', style: 'stayDate' },
                        { border: [false, false, false, false], text: booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A', style: 'stayDate' },
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
                { text: roomType?.name || 'Room Type', style: 'roomName' },
                { text: `${booking.adultsCount || 0} Adults, ${booking.childrenCount || 0} Children`, style: 'guestCount' },
                { text: `${booking.numberOfNights || 0} Night(s)`, style: 'guestCount' },
              ],
            },
          ],
          margin: [0, 0, 0, 40],
        },

        // Payment Table
        { text: isPartner ? 'SETTLEMENT SUMMARY' : 'PAYMENT SUMMARY', style: 'sectionHeader', margin: [0, 0, 0, 10] },
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
                { text: 'Accommodation Charges', style: 'tableCell' },
                { text: `₹${Number(booking.baseAmount || 0).toLocaleString()}`, style: 'tableCell', alignment: 'right' },
              ],
              [
                { text: 'Taxes & Service Fees', style: 'tableCell' },
                { text: `₹${Number(booking.taxAmount || 0).toLocaleString()}`, style: 'tableCell', alignment: 'right' },
              ],
              ...(booking.offerDiscountAmount > 0 ? [[
                { text: 'Seasonal Offer Discount', style: 'tableCell', color: '#22c55e' },
                { text: `-₹${Number(booking.offerDiscountAmount).toLocaleString()}`, style: 'tableCell', alignment: 'right', color: '#22c55e' },
              ]] : []),
              ...(booking.couponDiscountAmount > 0 ? [[
                { text: `Promotional Discount (${booking.couponCode || 'COUPON'})`, style: 'tableCell', color: '#22c55e' },
                { text: `-₹${Number(booking.couponDiscountAmount).toLocaleString()}`, style: 'tableCell', alignment: 'right', color: '#22c55e' },
              ]] : []),
              ...(booking.cpDiscount > 0 ? [[
                { text: 'Partner Network Discount', style: 'tableCell', color: '#22c55e' },
                { text: `-₹${Number(booking.cpDiscount).toLocaleString()}`, style: 'tableCell', alignment: 'right', color: '#22c55e' },
              ]] : []),
              [
                { text: 'Grand Total', style: 'tableTotalLabel' },
                { text: `₹${totalAmount.toLocaleString()}`, style: 'tableTotalValue', alignment: 'right' },
              ],
              ...(isPartner ? [
                [
                  { text: 'Instant Commission', style: 'tableCell', color: '#ef4444' },
                  { text: `-₹${cpCommission.toLocaleString()}`, style: 'tableCell', alignment: 'right', color: '#ef4444' },
                ],
                [
                  { text: 'Net Investment', style: 'tableTotalLabel', color: '#227c8a' },
                  { text: `₹${netInvestment.toLocaleString()}`, style: 'tableTotalValue', alignment: 'right', color: '#227c8a' },
                ]
              ] : []),
              [
                { text: 'Total Amount Paid', style: 'tablePaidLabel' },
                { text: `₹${Number(booking.paidAmount).toLocaleString()}`, style: 'tablePaidValue', alignment: 'right' },
              ],
              [
                { text: 'Remaining Balance (Due at Check-in)', style: 'tableBalanceLabel' },
                { text: `₹${Math.max(0, (isPartner ? netInvestment : totalAmount) - Number(booking.paidAmount)).toLocaleString()}`, style: 'tableBalanceValue', alignment: 'right' },
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

    try {
      const pdfDoc = this.pdfmakeManager.createPdf(docDefinition);
      return await pdfDoc.getBuffer();
    } catch (error) {
      this.logger.error(`Error creating PDF document: ${error.message}`, error.stack);
      throw error;
    }
  }
}
