import jsPDF from 'jspdf';

// ─── Data Interface ───────────────────────────────────────────────────────────
export interface InvoiceData {
  bookingNumber?: string;
  guestName: string;
  property: string;
  propertyImage?: string;
  city?: string;
  checkIn: string;
  checkOut: string;
  nights?: number;
  status: string;
  roomType?: string;
  adults?: number;
  children?: number;
  paymentMethod?: 'WALLET' | 'ONLINE';

  // Breakdown line items
  baseAmount: number;         // Accommodation base
  taxAmount: number;          // GST / Govt tax
  extraAdultAmount?: number;  // Extra adult charges
  extraChildAmount?: number;  // Extra child charges
  offerDiscountAmount?: number;     // Offer/early bird discount
  referralDiscountAmount?: number;  // Partner network discount
  commissionAmount?: number;        // CP commission (hidden from guest invoice)
  commissionRate?: number;          // e.g. 10 (%)
  discountRate?: number;            // e.g. 5 (%)

  // Final totals
  grossTotal: number;          // Total before commission (what guest pays)
  partnerNetPayable: number;   // Total after commission (what CP actually pays on wallet)
}

// ─── Helper ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${Math.abs(Number(n || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

// ─── Core builder ─────────────────────────────────────────────────────────────
function buildDoc(data: InvoiceData, type: 'GUEST' | 'PARTNER'): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const isPartner = type === 'PARTNER';
  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const contentW = pageW - margin * 2;

  const hex2rgb = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const setColor = (hex: string) => doc.setTextColor(...hex2rgb(hex));
  const setFill = (hex: string) => doc.setFillColor(...hex2rgb(hex));
  const setDraw = (hex: string) => doc.setDrawColor(...hex2rgb(hex));

  // ── Header Band ──────────────────────────────────────────────────────────
  setFill('#08474e');
  doc.rect(0, 0, pageW, 38, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  setColor('#ffffff');
  doc.text('ROUTE GUIDE', margin, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor('#99d6d9');
  doc.text('Travel · Discover · Belong', margin, 29);

  const badgeText = isPartner ? 'AGENCY INVOICE' : 'GUEST INVOICE';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor('#14b8a6');
  doc.text(badgeText, pageW - margin, 18, { align: 'right' });

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor('#99d6d9');
  doc.text(`Date: ${today}`, pageW - margin, 25, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setColor('#ffffff');
  doc.text(`REF: #${data.bookingNumber || 'N/A'}`, pageW - margin, 32, { align: 'right' });

  // ── Status Bar ───────────────────────────────────────────────────────────
  setFill('#0d9488');
  doc.rect(0, 38, pageW, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setColor('#ffffff');
  const statusText = `RESERVATION ${(data.status || 'CONFIRMED').replace(/_/g, ' ')}`;
  doc.text(statusText, pageW / 2, 44.5, { align: 'center' });

  // ── Two-column: Guest & Property ─────────────────────────────────────────
  let y = 58;
  const col1X = margin;
  const col2X = margin + contentW / 2 + 5;

  // Guest details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setColor('#64748b');
  doc.text('GUEST DETAILS', col1X, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor('#1a1a1a');
  doc.text(data.guestName || 'Guest', col1X, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor('#64748b');
  const occupancy = [data.adults ? `${data.adults} Adult${data.adults > 1 ? 's' : ''}` : '', data.children ? `${data.children} Child${data.children > 1 ? 'ren' : ''}` : ''].filter(Boolean).join(', ');
  doc.text(occupancy || 'ID & contact presented on arrival', col1X, y);

  // Property details
  let y2 = 58;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setColor('#64748b');
  doc.text('PROPERTY DETAILS', col2X, y2);
  y2 += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor('#1a1a1a');
  const propName = data.property || 'Property';
  doc.text(propName.length > 26 ? propName.slice(0, 24) + '…' : propName, col2X, y2);
  y2 += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor('#64748b');
  doc.text(data.city || 'Kerala, India', col2X, y2);

  y = Math.max(y, y2) + 10;

  // Divider
  setDraw('#e2e8f0');
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // ── Stay Summary Box ─────────────────────────────────────────────────────
  setFill('#f8fafc');
  setDraw('#e2e8f0');
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 28, 2, 2, 'FD');

  const thirdW = contentW / 3;
  const boxPad = 8;

  const drawBoxCol = (label: string, value: string, startX: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setColor('#64748b');
    doc.text(label, startX + boxPad, y + 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor('#1a1a1a');
    const safe = value.length > 18 ? value.slice(0, 16) + '…' : value;
    doc.text(safe, startX + boxPad, y + 18);
  };

  const nightLabel = data.nights ? `${data.nights} Night${data.nights > 1 ? 's' : ''}` : 'N/A';
  drawBoxCol('CHECK-IN', data.checkIn || 'N/A', margin);
  drawBoxCol('CHECK-OUT', data.checkOut || 'N/A', margin + thirdW);
  drawBoxCol('DURATION', nightLabel, margin + thirdW * 2);
  y += 38;

  // Room type band
  if (data.roomType) {
    setFill('#f0fdf4');
    setDraw('#bbf7d0');
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor('#0d9488');
    doc.text(`🛏  ${data.roomType}`, margin + boxPad, y + 6.5);
    y += 16;
  }

  // ── Payment Breakdown Table ───────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setColor('#64748b');
  doc.text(isPartner ? 'AGENCY SETTLEMENT SUMMARY' : 'PAYMENT SUMMARY', margin, y);
  y += 6;

  // Table header
  setFill('#f1f5f9');
  doc.rect(margin, y, contentW, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setColor('#475569');
  doc.text('Description', margin + 4, y + 6);
  doc.text('Amount (INR)', pageW - margin - 4, y + 6, { align: 'right' });
  y += 9;

  const drawRow = (label: string, value: string, valueColor = '#1a1a1a', bold = false) => {
    setDraw('#e2e8f0');
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    setColor('#475569');
    doc.text(label, margin + 4, y + 6.5);
    doc.setFont('helvetica', 'bold');
    setColor(valueColor);
    doc.text(value, pageW - margin - 4, y + 6.5, { align: 'right' });
    y += 10;
  };

  const nights = data.nights || 1;
  const roomLabel = `Accommodation${data.roomType ? ` – ${data.roomType}` : ''} (${nights} night${nights > 1 ? 's' : ''})`;
  drawRow(roomLabel.length > 52 ? roomLabel.slice(0, 50) + '…' : roomLabel, fmt(data.baseAmount));

  if ((data.taxAmount || 0) > 0) {
    drawRow('Government Tax & GST', fmt(data.taxAmount));
  }

  if ((data.extraAdultAmount || 0) > 0) {
    drawRow('Extra Adult Charges', fmt(data.extraAdultAmount!));
  }

  if ((data.extraChildAmount || 0) > 0) {
    drawRow('Extra Child Charges', fmt(data.extraChildAmount!));
  }

  if ((data.offerDiscountAmount || 0) > 0) {
    drawRow('Exclusive Offer / Early Bird Discount', `-${fmt(data.offerDiscountAmount!)}`, '#10b981');
  }

  if ((data.referralDiscountAmount || 0) > 0) {
    const dRate = data.discountRate ? ` (${data.discountRate}%)` : '';
    drawRow(`Partner Network Discount${dRate}`, `-${fmt(data.referralDiscountAmount!)}`, '#10b981');
  }

  // Commission row: PARTNER only
  if (isPartner && (data.commissionAmount || 0) > 0) {
    const cRate = data.commissionRate ? ` (${data.commissionRate}%)` : '';
    drawRow(`Instant Agency Commission${cRate}`, `-${fmt(data.commissionAmount!)}`, '#ef4444');
  }

  // ── Grand Total ───────────────────────────────────────────────────────────
  const finalAmount = isPartner ? data.partnerNetPayable : data.grossTotal;
  const totalLabel = isPartner ? 'Net Payable (After Commission)' : 'Grand Total';

  y += 2;
  setFill('#f0fdf4');
  doc.rect(margin, y, contentW, 14, 'F');
  setDraw('#bbf7d0');
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, 14, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor('#1a1a1a');
  doc.text(totalLabel, margin + 4, y + 9);
  doc.setFontSize(13);
  setColor('#0d9488');
  doc.text(fmt(finalAmount), pageW - margin - 4, y + 9, { align: 'right' });
  y += 22;

  // ── Payment Method Badge ──────────────────────────────────────────────────
  if (data.paymentMethod) {
    const badge = data.paymentMethod === 'WALLET' ? '💳 Wallet Payment — Commission deducted upfront' : '💳 Digital Payment (Razorpay)';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor('#64748b');
    doc.text(badge, margin, y);
    y += 8;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  setDraw('#e2e8f0');
  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 38, pageW - margin, pageH - 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setColor('#94a3b8');
  const terms = [
    '• Present a valid photo ID at check-in.',
    '• Standard check-in: 2:00 PM | Check-out: 11:00 AM.',
    '• Cancellation policies apply per resort terms & conditions.',
  ];
  terms.forEach((t, i) => doc.text(t, margin, pageH - 30 + i * 5));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setColor('#0d9488');
  doc.text('www.routeguide.in', pageW - margin, pageH - 25, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setColor('#94a3b8');
  doc.text('This is a computer-generated document. No signature required.', pageW / 2, pageH - 12, { align: 'center' });

  return doc;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Download the PDF directly. */
export function generateInvoicePdf(data: InvoiceData, type: 'GUEST' | 'PARTNER'): void {
  const doc = buildDoc(data, type);
  const fileName = `${type === 'PARTNER' ? 'Agency' : 'Guest'}_Invoice_${data.bookingNumber || 'Booking'}.pdf`;
  doc.save(fileName);
}

/** Return the PDF as a Blob (for iframe preview). */
export function generateInvoicePdfBlob(data: InvoiceData, type: 'GUEST' | 'PARTNER'): Blob {
  const doc = buildDoc(data, type);
  return doc.output('blob');
}
