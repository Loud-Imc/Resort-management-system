import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { SystemSettingsService } from '../system-settings/system-settings.service';

const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
let PdfPrinter: any;
let URLResolver: any;
let virtualFs: any;

try {
    PdfPrinter = require(path.join(pdfmakeDir, 'js', 'Printer')).default || require(path.join(pdfmakeDir, 'js', 'Printer'));
    URLResolver = require(path.join(pdfmakeDir, 'js', 'URLResolver')).default || require(path.join(pdfmakeDir, 'js', 'URLResolver'));
    virtualFs = require(path.join(pdfmakeDir, 'js', 'virtual-fs')).default || require(path.join(pdfmakeDir, 'js', 'virtual-fs'));
} catch {
    PdfPrinter = require(path.join(pdfmakeDir, 'js', 'printer')).default || require(path.join(pdfmakeDir, 'js', 'printer'));
    URLResolver = require(path.join(pdfmakeDir, 'js', 'urlresolver')).default || require(path.join(pdfmakeDir, 'js', 'urlresolver'));
    virtualFs = require(path.join(pdfmakeDir, 'js', 'virtual-fs')).default || require(path.join(pdfmakeDir, 'js', 'virtual-fs'));
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private printer: any;

  constructor(private readonly systemSettingsService: SystemSettingsService) {
    const fontsPath = path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto');
    
    const fonts = {
      Roboto: {
        normal: path.join(fontsPath, 'Roboto-Regular.ttf'),
        bold: path.join(fontsPath, 'Roboto-Medium.ttf'),
        italics: path.join(fontsPath, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsPath, 'Roboto-MediumItalic.ttf'),
      },
    };
    
    const urlResolver = new URLResolver(virtualFs);
    this.printer = new PdfPrinter(fonts, virtualFs, urlResolver);
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

  private async fetchImageAsBase64(url: string): Promise<string | null> {
    try {
        if (!url || !url.startsWith('http')) return null;
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (e) {
        this.logger.error(`Error fetching image ${url}: ${e.message}`);
    }
    return null;
  }

  private getExternalLogoBase64(logoUrl: string): string | null {
    if (!logoUrl) return null;
    
    // Extract filename from URL
    const urlParts = logoUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    // Safety check against path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return null;
    }
    
    const localPath = path.join(process.cwd(), 'uploads', filename);
    if (fs.existsSync(localPath)) {
      try {
        return fs.readFileSync(localPath).toString('base64');
      } catch (e) {
        this.logger.error(`Error reading agency logo at ${localPath}: ${e.message}`);
      }
    }
    return null;
  }

  async generateBookingConfirmation(booking: any, recipientType: 'GUEST' | 'PARTNER' = 'GUEST'): Promise<Buffer> {
    const property = booking.property || booking.room?.property || booking.room?.roomType?.property;
    const roomType = booking.roomType || booking.room?.roomType;
    const user = booking.user;

    const isPartner = recipientType === 'PARTNER';

    const totalAmount = Number(booking.totalAmount || 0);
    const cpCommission = Number(booking.cpCommission || 0);
    const cpDiscount = Number(booking.cpDiscount || 0);
    const offerDiscountAmount = Number(booking.offerDiscountAmount || 0);
    const couponDiscountAmount = Number(booking.couponDiscountAmount || 0);
    const paidAmount = Number(booking.paidAmount || 0);
    const netInvestment = totalAmount - cpCommission;

    // Fetch the property or room image
    let propertyImageBase64: string | null = null;
    const imageUrl = property?.images?.[0] || roomType?.images?.[0];
    if (imageUrl) {
        propertyImageBase64 = await this.fetchImageAsBase64(imageUrl);
    }

    const defaultInstructions = [
      'Please present a valid photo ID upon check-in.',
      'Standard check-in time is 2:00 PM and check-out is 11:00 AM.',
      'Early check-in and late check-out are subject to availability.',
      'All special requests are subject to availability upon arrival.'
    ];
    let adminInstructions = await this.systemSettingsService.getSetting('INVOICE_GUEST_INSTRUCTIONS');
    if (!Array.isArray(adminInstructions) || adminInstructions.length === 0) {
      adminInstructions = defaultInstructions;
    }

    let guestInstructions: string[] = [];
    const propertyPolicies = property?.policies as any;
    if (propertyPolicies && Array.isArray(propertyPolicies.invoiceInstructions) && propertyPolicies.invoiceInstructions.length > 0) {
        guestInstructions.push(...propertyPolicies.invoiceInstructions);
    }
    guestInstructions.push(...adminInstructions);

    const isCheckedIn = ['CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(booking.status);
    const docTitle = isCheckedIn 
      ? 'INVOICE' 
      : (isPartner ? 'PERFORMA INVOICE' : 'BOOKING CONFIRMATION');

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [30, 25, 30, 25],
      content: [
        // Header with Logo
        {
          columns: [
            {
              width: '*',
              stack: (() => {
                const cpLogoUrl = booking.channelPartner?.logo;
                const cpLogoBase64 = cpLogoUrl ? this.getExternalLogoBase64(cpLogoUrl) : null;
                const routeGuideLogoBase64 = this.getLogoBase64();

                if (isPartner && cpLogoBase64) {
                    return [
                        {
                            image: `data:image/png;base64,${cpLogoBase64}`,
                            width: 120,
                            margin: [0, 0, 0, 5]
                        },
                        {
                            text: 'Provided by',
                            fontSize: 8,
                            color: '#64748b',
                            margin: [0, 0, 0, 3]
                        },
                        routeGuideLogoBase64 
                          ? { image: `data:image/png;base64,${routeGuideLogoBase64}`, width: 70 }
                          : { text: 'Route Guide', style: 'brandLogo', fontSize: 12 }
                    ];
                } else {
                    return [
                        routeGuideLogoBase64 
                          ? { image: `data:image/png;base64,${routeGuideLogoBase64}`, width: 120 }
                          : { text: 'Route Guide', style: 'brandLogo' },
                        { text: 'Travel | Discover | Belong', style: 'brandTagline', margin: [0, 5, 0, 0] }
                    ];
                }
              })(),
            },
            {
              width: 'auto',
              stack: [
                { text: docTitle, style: 'docTitle' },
                { text: `ID: #${booking.bookingNumber || 'N/A'}`, style: 'bookingId' },
                { text: `Date: ${new Date().toLocaleDateString('en-IN')}`, style: 'docDate' },
              ],
              alignment: 'right',
            },
          ],
          margin: [0, 0, 0, 12],
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
                  fillColor: booking.status === 'CONFIRMED' ? '#227c8a' : (booking.status === 'RESERVED' ? '#f59e0b' : '#333333'),
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 10],
        },

        // Main info grid
        {
          table: {
            widths: [150, '*'],
            body: [
              // GUEST DETAILS
              [
                { text: 'GUEST DETAILS', style: 'sectionHeader' },
                {
                  stack: [
                    { text: `${user?.firstName || 'Guest'} ${user?.lastName || ''}`, style: 'guestName' },
                    { text: user?.email || 'N/A', style: 'guestInfo' },
                    { text: user?.phone || 'N/A', style: 'guestInfo' },
                    ...(booking.gstNumber ? [{ text: `GST: ${booking.gstNumber}`, style: 'guestInfo' }] : []),
                  ]
                }
              ],
              // PROPERTY DETAILS
              [
                { text: 'PROPERTY DETAILS', style: 'sectionHeader', margin: [0, 15, 0, 0] },
                {
                  stack: [
                    { text: property?.name || 'Property Name', style: 'propertyName' },
                    { text: property?.address || 'Address not available', style: 'propertyAddress' },
                    { text: `${property?.city || ''}, ${property?.state || ''}`, style: 'propertyAddress' },
                    ...(propertyImageBase64 ? [{
                      image: propertyImageBase64,
                      width: 200,
                      height: 80,
                      margin: [0, 6, 0, 0],
                    }] : []),
                  ],
                  margin: [0, 15, 0, 0]
                }
              ],
              // STAY SUMMARY
              [
                { text: 'STAY SUMMARY', style: 'sectionHeader', margin: [0, 15, 0, 0] },
                {
                  stack: [
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
                  ],
                  margin: [0, 15, 0, 0]
                }
              ],
              // ACCOMMODATION
              [
                { text: 'ACCOMMODATION', style: 'sectionHeader', margin: [0, 15, 0, 0] },
                {
                  stack: [
                    { text: roomType?.name || 'Room Type', style: 'roomName' },
                    ...(booking.isGroupBooking ? [
                      { text: `Group Booking of ${booking.groupSize || 0} People`, style: 'groupBookingInfo', margin: [0, 0, 0, 4] }
                    ] : []),
                    { text: `${booking.adultsCount || 0} Adults, ${booking.childrenCount || 0} Children`, style: 'guestCount' },
                    { text: `${booking.numberOfNights || 0} Night(s)`, style: 'guestCount' },
                  ],
                  margin: [0, 15, 0, 0]
                }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 15],
        },

        // Payment Table
        { text: isPartner ? 'SETTLEMENT SUMMARY' : 'PAYMENT SUMMARY', style: 'sectionHeader', margin: [0, 0, 0, 6] },
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
              ...(!isCheckedIn && isPartner ? [
                [
                  { text: 'Instant Commission', style: 'tableCell', color: '#ef4444' },
                  { text: `-₹${cpCommission.toLocaleString()}`, style: 'tableCell', alignment: 'right', color: '#ef4444' },
                ],
                [
                  { text: 'Net Investment', style: 'tableTotalLabel', color: '#227c8a' },
                  { text: `₹${netInvestment.toLocaleString()}`, style: 'tableTotalValue', alignment: 'right', color: '#227c8a' },
                ]
              ] : []),
              ...(!isCheckedIn ? [
                [
                  { text: 'Total Amount Paid', style: 'tablePaidLabel' },
                  { text: `₹${Number(booking.paidAmount).toLocaleString()}`, style: 'tablePaidValue', alignment: 'right' },
                ],
                [
                  { text: 'Remaining Balance (Due at Check-in)', style: 'tableBalanceLabel' },
                  { text: `₹${Math.max(0, (isPartner ? netInvestment : totalAmount) - Number(booking.paidAmount)).toLocaleString()}`, style: 'tableBalanceValue', alignment: 'right' },
                ],
              ] : []),
            ],
          },
          layout: {
            hLineWidth: (i) => (i === 0 || i === 1 || i >= 4) ? 0.5 : 0,
            vLineWidth: () => 0,
            hLineColor: () => '#e2e8f0',
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
          margin: [0, 0, 0, 14],
        },

        // QR and Notes
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'IMPORTANT INFORMATION', style: 'infoTitle' },
                {
                  ul: guestInstructions.map((instruction: string) => 
                    instruction.replace('{{PROPERTY_PHONE}}', property?.phone || '+91-XXXXXXXXXX')
                  ),
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
        brandLogo: { fontSize: 22, bold: true, color: '#227c8a', letterSpacing: 2 },
        brandTagline: { fontSize: 8, color: '#64748b', margin: [0, -3, 0, 0] },
        docTitle: { fontSize: 13, bold: true, color: '#0f172a' },
        bookingId: { fontSize: 10, bold: true, color: '#227c8a', margin: [0, 2, 0, 0] },
        docDate: { fontSize: 8, color: '#64748b' },
        statusBanner: { color: 'white', fontSize: 11, bold: true, alignment: 'center', margin: [0, 5, 0, 5] },
        sectionHeader: { fontSize: 8, bold: true, color: '#64748b', letterSpacing: 1, margin: [0, 0, 0, 5] },
        guestName: { fontSize: 11, bold: true, color: '#0f172a' },
        guestInfo: { fontSize: 9, color: '#475569' },
        propertyName: { fontSize: 11, bold: true, color: '#0f172a' },
        propertyAddress: { fontSize: 9, color: '#475569' },
        roomName: { fontSize: 10, bold: true, color: '#0f172a' },
        guestCount: { fontSize: 9, color: '#475569' },
        groupBookingInfo: { fontSize: 9, bold: true, color: '#227c8a' },
        stayLabel: { fontSize: 8, color: '#94a3b8', bold: true },
        stayDate: { fontSize: 9, bold: true, color: '#0f172a' },
        stayTime: { fontSize: 8, color: '#64748b' },
        tableHeader: { fontSize: 9, bold: true, color: '#475569', margin: [0, 3, 0, 3] },
        tableCell: { fontSize: 9, color: '#1e293b' },
        tableTotalLabel: { fontSize: 10, bold: true, color: '#0f172a', margin: [0, 3, 0, 3] },
        tableTotalValue: { fontSize: 11, bold: true, color: '#0f172a', margin: [0, 3, 0, 3] },
        tablePaidLabel: { fontSize: 9, bold: true, color: '#059669' },
        tablePaidValue: { fontSize: 10, bold: true, color: '#059669' },
        tableBalanceLabel: { fontSize: 9, bold: true, color: '#d97706' },
        tableBalanceValue: { fontSize: 10, bold: true, color: '#d97706' },
        infoTitle: { fontSize: 9, bold: true, color: '#0f172a', margin: [0, 0, 0, 6] },
        infoList: { fontSize: 8, color: '#475569', lineHeight: 1.3 },
        qrLabel: { fontSize: 7, color: '#94a3b8', italic: true },
        footer: { fontSize: 7, color: '#cbd5e1' },
        footerText: { fontSize: 7, color: '#cbd5e1' },
      },
      defaultStyle: { font: 'Roboto' },
    };

    try {
      const pdfDoc = await this.printer.createPdfKitDocument(docDefinition);
      
      return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: any) => reject(err));
        pdfDoc.end();
      });
    } catch (error) {
      this.logger.error(`Error creating PDF document: ${error.message}`, error.stack);
      throw error;
    }
  }
}
