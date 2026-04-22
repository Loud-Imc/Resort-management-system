import React from 'react';
import { X, User, MapPin, CreditCard, Tag, Info, CheckCircle2, Clock, XCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
}

const BookingDetailDrawer: React.FC<BookingDetailDrawerProps> = ({ isOpen, onClose, booking }) => {
    if (!booking) return null;

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'CONFIRMED':
                return { icon: <CheckCircle2 size={18} />, color: '#10b981', label: 'Confirmed' };
            case 'CHECKED_IN':
                return { icon: <Clock size={18} />, color: '#0ea5e9', label: 'Checked In' };
            case 'CHECKED_OUT':
                return { icon: <BadgeCheck size={18} color="#6366f1" />, color: '#6366f1', label: 'Completed' };
            case 'CANCELLED':
            case 'REFUNDED':
                return { icon: <XCircle size={18} />, color: '#ef4444', label: 'Cancelled' };
            case 'PENDING_PAYMENT':
                return { icon: <AlertCircle size={18} />, color: '#f59e0b', label: 'Awaiting Payment' };
            default:
                return { icon: <Info size={18} />, color: 'var(--text-dim)', label: status };
        }
    };

    const statusInfo = getStatusInfo(booking.status);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 1000,
                        }}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            width: 'min(500px, 100%)',
                            height: '100vh',
                            background: 'var(--bg-card)',
                            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.15)',
                            zIndex: 1001,
                            overflowY: 'auto',
                            padding: 0,
                            borderLeft: '1px solid var(--border-color)',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'white',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <div>
                                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Booking Details</h1>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>#{booking.bookingNumber || booking.id.slice(0, 8)}</p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '50%',
                                    background: 'var(--bg-light)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-dim)',
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Status Chip */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem',
                                borderRadius: '12px',
                                background: `${statusInfo.color}15`,
                                border: `1px solid ${statusInfo.color}30`,
                                color: statusInfo.color
                            }}>
                                {statusInfo.icon}
                                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.9rem' }}>
                                    {statusInfo.label}
                                </span>
                            </div>

                            {/* Section: Guest & Property */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Guest Name</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                        <User size={16} />
                                        <span>{booking.guestName}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Property</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                        <MapPin size={16} />
                                        <span>{booking.property}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Created By Audit */}
                            {booking.createdBy && (
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    background: 'var(--bg-light)',
                                    borderRadius: '12px',
                                    border: '1px dashed var(--border-color)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem'
                                }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking Origin</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--primary-teal)', fontSize: '0.9rem' }}>
                                        <ShieldCheck size={14} />
                                        <span>{booking.createdBy}</span>
                                    </div>
                                </div>
                            )}

                            {/* Section: Dates */}
                            <div style={{ background: 'var(--bg-light)', padding: '1.25rem', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>CHECK-IN</p>
                                        <p style={{ fontWeight: 700 }}>{booking.checkIn}</p>
                                    </div>
                                    <div style={{ flex: 0.5, borderBottom: '2px dashed var(--border-color)', margin: '0 1rem' }} />
                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>CHECK-OUT</p>
                                        <p style={{ fontWeight: 700 }}>{booking.checkOut}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Financials */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Financial Summary</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: 'var(--text-dim)' }}>Total Booking Amount</span>
                                        <span style={{ fontWeight: 600 }}>{booking.amount}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: 'var(--text-dim)' }}>Payment Status</span>
                                        <span style={{
                                            fontWeight: 600,
                                            color: booking.paymentStatus === 'FULL' ? '#10b981' : '#f59e0b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}>
                                            <CreditCard size={14} />
                                            {booking.paymentStatus || 'PARTIAL'}
                                        </span>
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--primary-teal)' }}>Commission Earned</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <span style={{ fontWeight: 800, color: 'var(--primary-teal)', fontSize: '1.1rem' }}>
                                                ₹{Number(booking.commissionAmount || 0).toLocaleString()}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1' }}>
                                                +{booking.pointsEarned || 0} pts
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Info boxes */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                {booking.roomType && (
                                    <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ padding: '0.75rem', background: '#f0fdfa', borderRadius: '10px', color: '#0d9488' }}>
                                            <Tag size={20} />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>Room Category</p>
                                            <p style={{ fontWeight: 600, margin: 0 }}>{booking.roomType}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{
                                marginTop: '2rem',
                                padding: '1rem',
                                background: '#f8fafc',
                                borderRadius: '12px',
                                fontSize: '0.85rem',
                                color: '#475569',
                                display: 'flex',
                                gap: '0.75rem',
                                alignItems: 'flex-start'
                            }}>
                                <Info size={16} color="#64748b" style={{ marginTop: '2px' }} />
                                <p style={{ margin: 0 }}>
                                    Commission and points are registered as **Pending** once the guest pays online, and are **Finalized** upon successful check-in at the property.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BookingDetailDrawer;
function BadgeCheck({ size, color }: { size: number; color: string; }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

