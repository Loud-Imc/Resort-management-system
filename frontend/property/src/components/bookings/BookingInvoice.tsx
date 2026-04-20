import { forwardRef } from 'react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import {
    MapPin,
    Package,
    Calendar,
    User,
    ShieldCheck,
    Info
} from 'lucide-react';
import type { Booking } from '../../types/booking';
import logo from '../../assets/logo.svg';

interface BookingInvoiceProps {
    booking: Booking;
}

export const BookingInvoice = forwardRef<HTMLDivElement, BookingInvoiceProps>(({ booking }, ref) => {
    const property = (booking as any).property || (booking.room?.roomType as any)?.property;
    const roomType = booking.room?.roomType || (booking as any).roomType;

    const balanceDue = Number(booking.totalAmount) - Number(booking.paidAmount);
    const isCancelled = booking.status === 'CANCELLED' || booking.status === 'REFUNDED';

    const formatPrice = (amount: number, currency: string = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0,
        }).format(amount);
    };


    return (
        <div ref={ref} className="bg-white p-0 pdf-target" style={{ width: '800px' }}>
            <style>{`
                .pdf-capture-mode {
                    display: block !important;
                    background-color: white !important;
                    width: 800px !important;
                }
                .pdf-capture-mode .header-bg {
                    background-color: #f8fafc !important;
                    color: #0f172a !important;
                    border-bottom: 4px solid #0d9488 !important;
                    padding: 40px !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                }
                .pdf-capture-mode .logo-img {
                    filter: brightness(0) !important;
                    height: 50px !important;
                }
                .pdf-capture-mode .invoice-badge {
                    background-color: #f0fdfa !important;
                    border: 2px solid #99f6e4 !important;
                    padding: 15px 25px !important;
                    border-radius: 12px !important;
                }
                .pdf-capture-mode .invoice-badge span {
                    color: #0d9488 !important;
                }
                .pdf-capture-mode .summary-box {
                    background-color: #ffffff !important;
                    border: 1px solid #e2e8f0 !important;
                    padding: 20px !important;
                }
                .pdf-capture-mode .payment-box {
                    background-color: #f8fafc !important;
                    border: 1px solid #e2e8f0 !important;
                    padding: 30px !important;
                }
            `}</style>

            <div className="pdf-content shadow-none border-none">
                {/* Header Area */}
                <div className="header-bg p-8 flex justify-between items-center bg-gray-50 border-b-4 border-teal-600">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <img src={logo} alt="Resort logo" className="logo-img h-10 w-auto" />
                            <div className="h-10 w-[1px] bg-gray-200 mx-2"></div>
                            <div>
                                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                                    {balanceDue > 0 ? 'Booking Confirmation & Performa Invoice' : 'Booking Confirmation & Invoice'}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-0.5 border-l-2 border-teal-500 pl-4">
                            <p className="text-sm font-black text-gray-900">{property?.name}</p>
                            <p className="text-[10px] text-gray-500 font-bold">{property?.address}</p>
                            <p className="text-[10px] text-gray-500 font-bold">{property?.city}, {property?.state}, {property?.pincode}</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="invoice-badge bg-teal-50/50 px-5 py-3 rounded-2xl border-2 border-teal-100 inline-block">
                            <span className="block text-[10px] text-teal-600 font-black uppercase tracking-widest mb-1 text-center">Booking ID</span>
                            <span className="text-xl font-black text-teal-950">#{booking.bookingNumber}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold mt-2 lowercase italic">Generated on {format(new Date(), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                </div>

                <div className="p-12">
                    <div className="grid grid-cols-2 gap-12">
                        {/* Left Column: Reservation Summary */}
                        <div className="summary-box rounded-2xl border border-gray-100 p-8 space-y-8">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-4">
                                <Package className="h-4 w-4 text-teal-600" />
                                Reservation Summary
                            </h3>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Check In</span>
                                        <div className="flex items-center gap-2 text-gray-800">
                                            <Calendar className="h-4 w-4 text-teal-500" />
                                            <span className="font-bold">
                                                {format(new Date(booking.checkInDate), 'MMM d, yyyy')}
                                                {(booking as any).checkedInAt
                                                    ? ` at ${format(new Date((booking as any).checkedInAt), 'hh:mm a')}`
                                                    : ` at ${format(new Date(`2000-01-01T${property?.defaultCheckInTime || '14:00'}:00`), 'hh:mm a')}`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Check Out</span>
                                        <div className="flex items-center gap-2 text-gray-800">
                                            <Calendar className="h-4 w-4 text-teal-500" />
                                            <span className="font-bold">
                                                {format(new Date(booking.checkOutDate), 'MMM d, yyyy')}
                                                {(booking as any).checkedOutAt
                                                    ? ` at ${format(new Date((booking as any).checkedOutAt), 'hh:mm a')}`
                                                    : ` at ${format(new Date(`2000-01-01T${property?.defaultCheckOutTime || '11:00'}:00`), 'hh:mm a')}`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Guests</span>
                                        <div className="flex items-center gap-2 text-gray-800">
                                            <User className="h-4 w-4 text-teal-500" />
                                            <span className="font-bold">
                                                {booking.isGroupBooking
                                                    ? `${booking.groupSize} Guests`
                                                    : `${booking.adultsCount} Adults, ${booking.childrenCount} Child`
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Room Unit</span>
                                        <div className="flex items-center gap-2 text-gray-800">
                                            <MapPin className="h-4 w-4 text-teal-500" />
                                            <span className="font-bold">Unit {booking.room.roomNumber}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl space-y-1 border border-gray-100">
                                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Guest Details</span>
                                    <p className="text-sm font-bold text-gray-900 border-l-2 border-teal-500 pl-3">
                                        {booking.guests?.[0]
                                            ? `${booking.guests[0].firstName} ${booking.guests[0].lastName}`
                                            : `${booking.user?.firstName} ${booking.user?.lastName}`}
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-medium pl-3">
                                        {booking.guests?.[0]?.phone || booking.user?.phone || 'No phone provided'}
                                    </p>
                                </div>

                                {booking as any && (booking as any).gstNumber && (
                                    <div className="p-4 bg-teal-50/30 rounded-xl border border-teal-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-teal-600" />
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">GST Registered</span>
                                        </div>
                                        <span className="text-xs font-bold text-teal-700">{(booking as any).gstNumber}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Payment Details */}
                        <div className="payment-box rounded-2xl p-8 space-y-6 bg-gray-50/50">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-4">Payment Details</h3>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">{(roomType as any)?.isGstInclusive ? 'Room Charges (GST Inc.)' : `Nightly Rate x ${booking.numberOfNights}`}</span>
                                    <span className="font-bold text-gray-900">{formatPrice((roomType as any)?.isGstInclusive ? (Number(booking.baseAmount) + Number(booking.taxAmount)) : (Number(booking.baseAmount)), booking.bookingCurrency || 'INR')}</span>
                                </div>

                                {!(roomType as any)?.isGstInclusive && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Service Tax (GST)</span>
                                        <span className="font-bold text-gray-900">{formatPrice(Number(booking.taxAmount), booking.bookingCurrency || 'INR')}</span>
                                    </div>
                                )}

                                {Number(booking.couponDiscountAmount) > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600 font-bold">
                                        <span>Discount</span>
                                        <span>-{formatPrice(Number(booking.couponDiscountAmount), booking.bookingCurrency || 'INR')}</span>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-gray-200 space-y-4">
                                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</span>
                                        <span className="text-xl font-black text-gray-900">{formatPrice(Number(booking.totalAmount), booking.bookingCurrency || 'INR')}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-4">
                                        <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Amount Paid</span>
                                        <span className="text-xl font-black text-teal-600 underline decoration-teal-100 decoration-4 underline-offset-4">{formatPrice(Number(booking.paidAmount), booking.bookingCurrency || 'INR')}</span>
                                    </div>

                                    {balanceDue > 0 && !isCancelled && (
                                        <div className="flex justify-between items-center p-4 bg-amber-50 rounded-xl border-2 border-amber-100 border-dashed">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Balance Payable</span>
                                                <span className="text-[10px] text-amber-700 italic font-medium">at check-in</span>
                                            </div>
                                            <span className="text-2xl font-black text-amber-600">
                                                {formatPrice(balanceDue, booking.bookingCurrency || 'INR')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Verification Footer */}
                            <div className="flex flex-col items-center justify-center pt-8 border-t border-gray-200 mt-4 gap-4">
                                <div className="p-2.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                    <QRCodeSVG
                                        value={`BOOKING_VERIFY:${booking.bookingNumber}:${booking.id}`}
                                        size={70}
                                        level="H"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">Authenticated Document</p>
                                    <p className="text-[8px] text-gray-300 font-medium font-mono lowercase">{booking.id}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 p-8 bg-gray-50 rounded-3xl border border-gray-100 border-dashed">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Info className="h-4 w-4 text-teal-500" />
                            Guest Instructions
                        </h4>
                        <div className="grid grid-cols-2 gap-8">
                            <ul className="text-[11px] text-gray-500 space-y-2 list-disc pl-4 font-medium">
                                <li>Please present a valid ID for all guests at check-in (Aadhar/Passport).</li>
                                <li>Standard Check-in: {format(new Date(`2000-01-01T${property?.defaultCheckInTime || '14:00'}:00`), 'hh:mm a')} | Check-out: {format(new Date(`2000-01-01T${property?.defaultCheckOutTime || '11:00'}:00`), 'hh:mm a')}.</li>
                                <li>Early check-in is subject to room availability.</li>
                            </ul>
                            <ul className="text-[11px] text-gray-500 space-y-2 list-disc pl-4 font-medium">
                                <li>The property is a non-smoking zone in common areas.</li>
                                <li>Please inform your meal preferences 2 hours in advance.</li>
                                <li>Pets are allowed only in pre-designated units.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

BookingInvoice.displayName = 'BookingInvoice';
