import React from 'react';
import type { InvoiceData } from '../utils/generateInvoicePdf';
import { MapPin } from 'lucide-react';
import logo from '../assets/routeguide.svg';

interface Props {
  data: InvoiceData;
  type: 'GUEST' | 'PARTNER';
  id?: string;
}

const CPInvoiceTemplate = React.forwardRef<HTMLDivElement, Props>(({ data, type, id }, ref) => {
  const isPartner = type === 'PARTNER';
  const generatedAt = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const fmt = (n: number | undefined) =>
    `₹${Math.abs(Number(n || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // ── Totals ────────────────────────────────────────────────────────────────
  const finalTotal = isPartner ? data.partnerNetPayable : data.grossTotal;

  return (
    <div
      id={id}
      ref={ref}
      style={{
        width: '800px',
        background: '#ffffff',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        color: '#1a1a1a',
        fontSize: '13px',
        lineHeight: 1.5,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#f8fafc',
        borderBottom: '4px solid #0d9488',
        padding: '32px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        {/* Left: Logo + Property */}
        <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            {/* SVG logo */}
            <img 
              src={logo} 
              alt="Route Guide" 
              style={{
                 height: '38px',
                 width: 'auto',
                 filter: 'brightness(0)' // make it black to match the design
              }} 
            />
            <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }} />
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              {isPartner ? 'Agency Invoice & Settlement' : 'Official Booking Confirmation & Invoice'}
            </div>
          </div>

          <div style={{ borderLeft: '3px solid #0d9488', paddingLeft: '14px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{data.property}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{data.city || 'Kerala, India'}</div>
          </div>
        </div>

        {/* Right: Booking ID badge */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            border: '2px solid #99f6e4',
            borderRadius: '12px',
            padding: '14px 22px',
            background: '#f0fdfa',
            display: 'inline-block',
            marginBottom: '8px',
          }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>
              BOOKING ID
            </div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
              #{data.bookingNumber || 'N/A'}
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>
            generated on {generatedAt}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>

        {/* Left: Reservation Summary */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#0d9488' }}>⊞</span> Reservation Summary
          </h3>

          {/* Property Card */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            marginBottom: '24px',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '10px',
              background: '#f1f5f9', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}>
              {data.propertyImage ? (
                <img crossOrigin="anonymous" src={data.propertyImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={data.property} />
              ) : (
                <MapPin size={24} color="#94a3b8" />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{data.property}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {data.roomType || 'Standard Room'}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', marginTop: '4px' }}>
                #{data.bookingNumber}
              </div>
            </div>
          </div>

          {/* Stay Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                CHECK IN
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#0d9488' }}>📅</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{data.checkIn}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                CHECK OUT
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#0d9488' }}>📅</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{data.checkOut}</span>
              </div>
            </div>

            {(data.adults !== undefined) && (
              <div>
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                  GUESTS
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#0d9488' }}>👤</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                    {data.adults} Adult{data.adults !== 1 ? 's' : ''}{data.children ? `, ${data.children} Child` : ''}
                  </span>
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                STATUS
              </div>
              <span style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 800,
                background: '#dcfce7',
                color: '#166534',
                border: '1px solid #bbf7d0',
              }}>
                {(data.status || 'CONFIRMED').replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Guest name */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
              PRIMARY GUEST
            </div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{data.guestName}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Please present a valid photo ID at check-in
            </div>
          </div>
        </div>

        {/* Right: Payment Details */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '20px' }}>
            Payment Details
          </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Row renderer */}
            {[
              {
                label: `Accommodation – ${data.roomType || 'Standard Room'} (${data.nights || 1} night${data.nights && data.nights > 1 ? 's' : ''}) :`,
                value: fmt(data.baseAmount),
                show: true,
              },
              {
                label: 'Government Tax & GST :',
                value: fmt(data.taxAmount),
                show: (data.taxAmount || 0) > 0,
              },
              {
                label: 'Extra Adult Charges :',
                value: fmt(data.extraAdultAmount),
                show: (data.extraAdultAmount || 0) > 0,
              },
              {
                label: 'Extra Child Charges :',
                value: fmt(data.extraChildAmount),
                show: (data.extraChildAmount || 0) > 0,
              },
              {
                label: 'Exclusive Offer Discount :',
                value: `-${fmt(data.offerDiscountAmount)}`,
                show: (data.offerDiscountAmount || 0) > 0,
              },
              {
                label: `Partner Network Discount${data.discountRate ? ` (${data.discountRate}%)` : ''} :`,
                value: `-${fmt(data.referralDiscountAmount)}`,
                show: (data.referralDiscountAmount || 0) > 0,
              },
              // PARTNER only
              {
                label: `Instant Agency Commission${data.commissionRate ? ` (${data.commissionRate}%)` : ''} :`,
                value: `-${fmt(data.commissionAmount)}`,
                show: isPartner && (data.commissionAmount || 0) > 0,
              },
            ].filter(r => r.show).map((row, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                fontSize: '13px',
              }}>
                <span style={{ color: '#64748b' }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{row.value}</span>
              </div>
            ))}

            {/* Final Total */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0 0 0',
              borderTop: '2px solid #e2e8f0',
              marginTop: '12px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                {isPartner ? 'Net Payable (After Commission) :' : 'Grand Total :'}
              </span>
              <span style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a' }}>
                {fmt(finalTotal)}
              </span>
            </div>

            {/* Payment method badge */}
            {data.paymentMethod && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '11px',
                color: '#64748b',
                marginTop: '8px',
              }}>
                💳 {data.paymentMethod === 'WALLET' ? 'Paid via Partner Wallet — Commission deducted upfront' : 'Paid via Online Payment (Razorpay)'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Important Information ──────────────────────────────────────────── */}
      <div style={{ padding: '0 40px 40px' }}>
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '18px 22px',
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#dbeafe', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
          }}>
            👤
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e40af', marginBottom: '4px' }}>
              Important Information
            </div>
            <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
              Please present this confirmation and a valid photo ID at the resort reception during check-in.
              Standard check-in time is 2:00 PM and check-out is 11:00 AM.
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid #e2e8f0',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f8fafc',
        fontSize: '10px',
        color: '#94a3b8',
      }}>
        <span>www.routeguide.in</span>
        <span>This is a computer-generated document. No signature required.</span>
        <span>© {new Date().getFullYear()} Route Guide</span>
      </div>
    </div>
  );
});

CPInvoiceTemplate.displayName = 'CPInvoiceTemplate';
export default CPInvoiceTemplate;
