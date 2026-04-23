import React from 'react';
import { Mail, MapPin, Globe, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import logo from '../assets/routeguide.svg';

interface InvoiceTemplateProps {
    booking: any;
    type: 'GUEST' | 'PARTNER';
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ booking, type }) => {
    if (!booking) return null;

    const isPartner = type === 'PARTNER';
    const totalAmount = Number(booking.rawAmount || 0);
    const commission = Number(isPartner ? (booking.commissionAmount || 0) : 0);
    const netInvestment = totalAmount - commission;

    return (
        <div id={`invoice-capture-${booking.id}-${type}`} style={{
            width: '794px', // A4 Width at 96 DPI
            padding: '40px',
            background: 'white',
            color: '#1a1a1a',
            fontFamily: "'Inter', sans-serif",
            position: 'absolute',
            left: '-9999px',
            top: 0,
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div>
                    <img src={logo} alt="Route Guide" style={{ height: '40px', filter: 'brightness(0)', marginBottom: '15px' }} />
                    <p style={{ margin: 0, fontSize: '10px', color: '#666', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>Travel | Discover | Belong</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#0d9488' }}>
                        {isPartner ? 'AGENCY INVOICE' : 'BOOKING CONFIRMATION'}
                    </h1>
                    <p style={{ margin: '5px 0 0', fontSize: '14px', fontWeight: 700 }}>#{booking.bookingNumber}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>Date: {format(new Date(), 'MMM dd, yyyy')}</p>
                </div>
            </div>

            {/* Status Banner */}
            <div style={{
                background: '#0d9488',
                color: 'white',
                padding: '12px',
                textAlign: 'center',
                borderRadius: '8px',
                marginBottom: '40px',
                fontWeight: 800,
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }}>
                Reservation {booking.status.replace('_', ' ')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                {/* Guest Details */}
                <div>
                    <h3 style={{ fontSize: '10px', color: '#999', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Guest Details</h3>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{booking.guestName}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px', color: '#444' }}>
                        <Mail size={12} /> <span>Guest Contact shared on arrival</span>
                    </div>
                </div>

                {/* Property Details */}
                <div>
                    <h3 style={{ fontSize: '10px', color: '#999', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Property Details</h3>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{booking.property}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px', color: '#444' }}>
                        <MapPin size={12} /> <span>{booking.city || 'Property Location'}</span>
                    </div>
                </div>
            </div>

            {/* Stay Summary */}
            <div style={{ border: '1px solid #eee', borderRadius: '12px', padding: '20px', marginBottom: '40px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '10px', color: '#999', fontWeight: 800 }}>CHECK-IN</p>
                        <p style={{ margin: '5px 0 0', fontSize: '14px', fontWeight: 700 }}>{booking.checkIn}</p>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #eee', borderRight: '1px solid #eee' }}>
                        <p style={{ margin: 0, fontSize: '10px', color: '#999', fontWeight: 800 }}>CHECK-OUT</p>
                        <p style={{ margin: '5px 0 0', fontSize: '14px', fontWeight: 700 }}>{booking.checkOut}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '10px', color: '#999', fontWeight: 800 }}>ACCOMMODATION</p>
                        <p style={{ margin: '5px 0 0', fontSize: '14px', fontWeight: 700 }}>{booking.roomType}</p>
                    </div>
                </div>
            </div>

            {/* Financials Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', color: '#666' }}>Description</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', color: '#666' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>Stay Reservation Charges (Taxes Inclusive)</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>₹{totalAmount.toLocaleString()}</td>
                    </tr>
                    {isPartner && (
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px', fontSize: '13px', color: '#ef4444' }}>Instant Agency Commission</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>-₹{commission.toLocaleString()}</td>
                        </tr>
                    )}
                    <tr>
                        <td style={{ padding: '20px 12px 12px', fontSize: '15px', fontWeight: 900 }}>Total Payable</td>
                        <td style={{ padding: '20px 12px 12px', textAlign: 'right', fontSize: '18px', fontWeight: 900, color: '#0d9488' }}>
                            ₹{(isPartner ? netInvestment : totalAmount).toLocaleString()}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Footer */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px', marginTop: 'auto', paddingTop: '40px', borderTop: '2px solid #eee' }}>
                <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 800, color: '#444' }}>Terms & Conditions</h4>
                    <ul style={{ margin: 0, padding: '0 0 0 15px', fontSize: '10px', color: '#666', lineHeight: '1.6' }}>
                        <li>Please present a valid photo ID at the time of check-in.</li>
                        <li>Standard check-in time is 2:00 PM and check-out is 11:00 AM.</li>
                        <li>Cancellation policies apply as per resort rules.</li>
                        <li>This is a computer-generated confirmation.</li>
                    </ul>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', color: '#999', fontSize: '10px', marginBottom: '5px' }}>
                        <Globe size={10} /> <span>www.routeguide.in</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', color: '#999', fontSize: '10px' }}>
                        <ShieldCheck size={10} /> <span>Secure Verification</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceTemplate;
