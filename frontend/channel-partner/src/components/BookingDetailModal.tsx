import React from 'react';
import ReactDOM from 'react-dom';
import { X, User, Users, Briefcase, MapPin, CreditCard, Info, CheckCircle2, Clock, XCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '../utils/currency';

interface BookingDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
}

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ isOpen, onClose, booking }) => {
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

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    pointerEvents: 'none'
                }}>
                    {/* Backdrop */}
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
                            background: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(12px)',
                            pointerEvents: 'auto',
                            zIndex: -1
                        }}
                    />

                    {/* Modal Content container */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 15 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '600px',
                            maxHeight: '85vh',
                            background: 'var(--bg-card)',
                            borderRadius: '32px',
                            boxShadow: '0 40px 80px -12px rgba(0, 0, 0, 0.7)',
                            overflow: 'hidden',
                            border: '1px solid var(--border-glass)',
                            display: 'flex',
                            flexDirection: 'column',
                            pointerEvents: 'auto'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.75rem 2.5rem',
                            borderBottom: '1px solid var(--border-glass)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.02)',
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: 'var(--text-main)' }}>Booking Intelligence</h2>
                                <p style={{ fontSize: '0.85rem', color: 'var(--primary-teal)', fontWeight: 800, margin: 0 }}>#{booking.bookingNumber || booking.id.slice(0, 8)}</p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '0.6rem',
                                    borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-glass)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-dim)',
                                    transition: 'all 0.2s'
                                }}
                                className="hover-scale"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div style={{ padding: '2.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Status Banner */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.25rem',
                                padding: '1.5rem',
                                borderRadius: '20px',
                                background: `${statusInfo.color}12`,
                                border: `1px solid ${statusInfo.color}25`,
                                color: statusInfo.color
                            }}>
                                <div style={{ background: `${statusInfo.color}25`, padding: '0.75rem', borderRadius: '12px' }}>
                                    {statusInfo.icon}
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.7, margin: '0 0 0.2rem' }}>Current Status</p>
                                    <p style={{ fontWeight: 900, fontSize: '1.2rem', margin: 0 }}>{statusInfo.label}</p>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Principal Guest</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1.1rem' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '10px' }}><User size={20} /></div>
                                        <span>{booking.guestName}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Destination Property</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1.1rem' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '10px' }}><MapPin size={20} /></div>
                                        <span>{booking.property}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Origin */}
                            {booking.createdBy && (
                                <div className="glass-pane" style={{ padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px' }}>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Booking Managed By</p>
                                        <p style={{ fontWeight: 800, color: 'var(--primary-teal)', margin: 0, fontSize: '1.05rem' }}>{booking.createdBy}</p>
                                    </div>
                                    <ShieldCheck size={28} color="var(--primary-teal)" opacity={0.6} />
                                </div>
                            )}

                            {/* Section: Timeline */}
                            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1.75rem', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                                    <div style={{ textAlign: 'center', flex: 1, zIndex: 1 }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 800, marginBottom: '0.6rem', letterSpacing: '0.12em' }}>CHECK-IN</p>
                                        <p style={{ fontWeight: 900, fontSize: '1.3rem' }}>{booking.checkIn}</p>
                                    </div>
                                    <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, transparent, var(--primary-teal), transparent)', margin: '0 1.5rem', opacity: 0.4 }} />
                                    <div style={{ textAlign: 'center', flex: 1, zIndex: 1 }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 800, marginBottom: '0.6rem', letterSpacing: '0.12em' }}>CHECK-OUT</p>
                                        <p style={{ fontWeight: 900, fontSize: '1.3rem' }}>{booking.checkOut}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Financials */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <CreditCard size={22} color="var(--primary-teal)" />
                                    Financial Settlement
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.75rem', border: '1px solid var(--border-glass)', borderRadius: '24px', background: 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                                        <span style={{ color: 'var(--text-dim)' }}>Gross Booking Value</span>
                                        <span style={{ fontWeight: 800 }}>{booking.amount}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                                        <span style={{ color: 'var(--text-dim)' }}>Partner Commission</span>
                                        <span style={{ fontWeight: 900, color: '#10b981' }}>{formatPrice(booking.commissionAmount || 0, 'INR')}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '0.75rem', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ fontWeight: 900, color: 'var(--primary-teal)', fontSize: '1.5rem', margin: 0 }}>
                                                {formatPrice(booking.commissionAmount || 0, 'INR')}
                                            </p>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 900, color: '#6366f1', margin: '0.2rem 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                + {booking.pointsEarned || 0} Reward Points
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.1em' }}>Settlement</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: booking.paymentStatus === 'FULL' ? '#10b981' : '#f59e0b', fontWeight: 900, fontSize: '1rem' }}>
                                                {booking.paymentStatus === 'FULL' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                                {booking.paymentStatus || 'PARTIAL'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Download Actions */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button 
                                        onClick={() => (window as any).handleDownloadInvoice(booking, 'GUEST')}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                            padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--border-glass)', color: 'white', fontWeight: 700,
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                        className="hover-scale"
                                    >
                                        <Users size={20} color="var(--primary-teal)" />
                                        <span>Guest Invoice</span>
                                    </button>
                                    <button 
                                        onClick={() => (window as any).handleDownloadInvoice(booking, 'PARTNER')}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                            padding: '1rem', borderRadius: '16px', background: 'rgba(20,184,166,0.1)',
                                            border: '1px solid var(--primary-teal)', color: 'white', fontWeight: 700,
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                        className="hover-scale"
                                    >
                                        <Briefcase size={20} color="var(--primary-teal)" />
                                        <span>Agency Invoice</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer / Tip */}
                        <div style={{ padding: '1.75rem 2.5rem', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid var(--border-glass)' }}>
                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                <div style={{ background: 'rgba(20,184,166,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                                    <Info size={18} color="var(--primary-teal)" />
                                </div>
                                <p style={{ margin: 0, lineHeight: '1.5' }}>
                                    Commission is credited as <b>Pending</b> upon booking and <b>Finalized</b> following guest verification at check-in.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default BookingDetailModal;

function BadgeCheck({ size, color }: { size: number; color: string; }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
