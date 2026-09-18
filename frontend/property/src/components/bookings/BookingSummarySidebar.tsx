import React, { useState } from 'react';
import { Calendar, Users, Sparkles, CheckCircle, Loader2, Tag, X } from 'lucide-react';
import type { PriceCalculationResult } from '../../types/booking';
import type { RoomType } from '../../types/room';

interface BookingSummarySidebarProps {
    propertyName?: string;
    checkInDate: string;
    checkOutDate: string;
    adultsCount: number;
    childrenCount: number;
    infantsCount: number;
    childAges: number[];
    isGroupBooking: boolean;
    groupSize?: number;
    selectedSolution: any;
    solutionRoomAssignments: Record<number, string>;
    roomTypes: RoomType[] | undefined;
    priceDetails: PriceCalculationResult | null;
    originalPriceDetails: PriceCalculationResult | null;
    overrideTotal?: number;
    isOverrideInclusive?: boolean;
    paymentOption: string;
    paymentMethod: string;
    paidAmount?: number;
    isSubmitting: boolean;
    isReadyToBook: boolean;
    appliedCode?: string;
    onApplyCode?: (code: string) => Promise<boolean | void>;
    onRemoveCode?: () => void;
    isApplyingCode?: boolean;
    codeMessage?: string | null;
    isCodeError?: boolean;
}

export const BookingSummarySidebar: React.FC<BookingSummarySidebarProps> = ({
    propertyName,
    checkInDate,
    checkOutDate,
    adultsCount,
    childrenCount,
    infantsCount,
    childAges,
    isGroupBooking,
    groupSize,
    selectedSolution,
    solutionRoomAssignments,
    roomTypes,
    priceDetails,
    originalPriceDetails,
    overrideTotal,
    isOverrideInclusive,
    paymentOption,
    paymentMethod,
    paidAmount,
    isSubmitting,
    isReadyToBook,
    appliedCode,
    onApplyCode,
    onRemoveCode,
    isApplyingCode = false,
    codeMessage,
    isCodeError = false,
}) => {
    const [inputCode, setInputCode] = useState('');

    const allocatedRooms = selectedSolution?.rooms || selectedSolution?.allocatedRooms || [];
    const solTitle = selectedSolution?.solutionName || (
        allocatedRooms.length > 1
            ? `${allocatedRooms.length}-Room Accommodation Solution`
            : (allocatedRooms[0]?.roomTypeName || 'Selected Accommodation Solution')
    );

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))) || 1;

    const details = priceDetails || originalPriceDetails;
    const isInclusive = details?.isGstInclusive || false;

    // Determine total and balance
    const finalTotal = overrideTotal ? Number(overrideTotal) : (priceDetails?.totalAmount ?? 0);
    const recordedPaid = paymentOption === 'FULL' ? finalTotal : (Number(paidAmount) || 0);
    const balanceDue = Math.max(0, finalTotal - recordedPaid);

    const handleApply = async () => {
        if (!inputCode.trim() || !onApplyCode) return;
        await onApplyCode(inputCode.trim());
        setInputCode('');
    };

    return (
        <div className="bg-card rounded-2xl shadow-xl border border-border sticky top-20 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/50"></div>
            
            <div className="p-5 sm:p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
                            {propertyName || 'Property Reservation'}
                        </span>
                        <h2 className="text-base font-black text-foreground tracking-tight">
                            BOOKING SUMMARY
                        </h2>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        <Calendar className="h-4 w-4" />
                    </div>
                </div>

                {/* Stay & Party Overview */}
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-semibold">Stay:</span>
                        <span className="font-bold text-foreground">
                            {checkInDate} → {checkOutDate} ({nights} Night{nights > 1 ? 's' : ''})
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-semibold">Party:</span>
                        <span className="font-bold text-foreground flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            {isGroupBooking ? (
                                `Group of ${groupSize || (adultsCount + childrenCount)} (${adultsCount} Adults, ${childrenCount} Children)`
                            ) : (
                                `${adultsCount} Adult${adultsCount > 1 ? 's' : ''}, ${childrenCount} Child${childrenCount > 1 ? 'ren' : ''}${infantsCount > 0 ? `, ${infantsCount} Inf` : ''}`
                            )}
                        </span>
                    </div>
                    {!isGroupBooking && childAges.length > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Child Ages:</span>
                            <span className="font-medium text-foreground">{childAges.join(', ')} yrs</span>
                        </div>
                    )}
                </div>

                {/* Selected Accommodation Solution & Physical Rooms Checklist */}
                {selectedSolution && (
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> Selected Accommodation
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground">
                                {allocatedRooms.length} Room{allocatedRooms.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <p className="text-xs font-black text-foreground">{solTitle}</p>
                        
                        <div className="space-y-1 pt-1 border-t border-primary/10">
                            {allocatedRooms.map((ar: any, idx: number) => {
                                const assignedId = solutionRoomAssignments[idx];
                                const rt = roomTypes?.find(r => r.id === ar.roomTypeId);
                                const assignedRoom = rt?.rooms?.find((r: any) => r.id === assignedId);
                                const childAgesStr = ar.childAges && ar.childAges.length > 0 ? ` (${ar.childAges.join(',')})` : '';

                                return (
                                    <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 border-b border-border/40 last:border-0">
                                        <span className="font-semibold text-foreground truncate pr-2">
                                            R{idx + 1}: {ar.roomTypeName} ({ar.adults}A{ar.children > 0 ? `, ${ar.children}C${childAgesStr}` : ''})
                                        </span>
                                        <span className="font-bold text-[9.5px] text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                            {assignedRoom ? `Room #${assignedRoom.roomNumber}` : 'Auto'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Itemized Financial Breakdown */}
                {!details ? (
                    <div className="py-5 text-center text-xs text-muted-foreground italic border border-dashed border-border rounded-xl">
                        Select an Accommodation Solution to view price breakdown.
                    </div>
                ) : (
                    <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/50">
                            <span>Item</span>
                            <span>Amount</span>
                        </div>

                        {/* Base Room Rate */}
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium">
                                Accommodation ({allocatedRooms.length || 1} Rms × {nights} Nts)
                            </span>
                            <span className="font-semibold text-foreground">
                                ₹{(isInclusive ? (details.grossBaseAmount ?? (details.baseAmount + details.taxAmount)) : details.baseAmount).toFixed(2)}
                            </span>
                        </div>

                        {/* Extra Adult/Child Charges */}
                        {details.extraAdultAmount > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground font-medium">Extra Adults</span>
                                <span className="font-semibold text-foreground">+₹{details.extraAdultAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {details.extraChildAmount > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground font-medium">Extra Children</span>
                                <span className="font-semibold text-foreground">+₹{details.extraChildAmount.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Taxes / GST */}
                        {!isInclusive && details.taxAmount > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground font-medium">GST ({details.taxRate}%)</span>
                                <span className="font-semibold text-foreground">+₹{details.taxAmount.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Discounts */}
                        {details.offerDiscountAmount > 0 && (
                            <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                                <span>Offer Discount</span>
                                <span>-₹{(isInclusive ? (details.grossOfferDiscountAmount ?? details.offerDiscountAmount) : details.offerDiscountAmount).toFixed(2)}</span>
                            </div>
                        )}
                        {details.couponDiscountAmount > 0 && (
                            <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                                <span>Coupon Discount</span>
                                <span>-₹{(isInclusive ? (details.grossCouponDiscountAmount ?? details.couponDiscountAmount) : details.couponDiscountAmount).toFixed(2)}</span>
                            </div>
                        )}
                        {details.referralDiscountAmount > 0 && (
                            <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                                <span>Referral Discount</span>
                                <span>-₹{(isInclusive ? (details.grossReferralDiscountAmount ?? details.referralDiscountAmount) : details.referralDiscountAmount).toFixed(2)}</span>
                            </div>
                        )}

                        {/* Tax Slab Transition Notice */}
                        {originalPriceDetails && originalPriceDetails.taxRate !== details.taxRate && details.taxRate > 0 && (
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-700 dark:text-blue-300">
                                <span className="font-bold">GST Slab Adjusted:</span> Rate lowered from {originalPriceDetails.taxRate}% to {details.taxRate}% (Net tariff &le; ₹7,500/night).
                            </div>
                        )}

                        {/* Promo / Referral Code Input Box */}
                        <div className="pt-2 border-t border-border/60 space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Tag className="h-3 w-3" /> Promo / Referral Code
                            </label>

                            {appliedCode ? (
                                <div className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs">
                                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                        ✓ {appliedCode}
                                    </span>
                                    {onRemoveCode && (
                                        <button
                                            type="button"
                                            onClick={onRemoveCode}
                                            className="text-muted-foreground hover:text-red-500 p-0.5 cursor-pointer transition-colors"
                                            title="Remove Code"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        placeholder="Enter Code"
                                        value={inputCode}
                                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApply(); } }}
                                        className="flex-1 min-w-0 px-2.5 py-1.5 text-xs uppercase bg-background border border-border rounded-lg font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleApply}
                                        disabled={isApplyingCode || !inputCode.trim()}
                                        className="px-3 py-1.5 text-xs font-black uppercase bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-50 cursor-pointer transition-colors"
                                    >
                                        {isApplyingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'APPLY'}
                                    </button>
                                </div>
                            )}

                            {codeMessage && (
                                <p className={`text-[10px] font-medium ${isCodeError ? 'text-destructive' : 'text-emerald-600'}`}>
                                    {codeMessage}
                                </p>
                            )}
                        </div>

                        {/* Manual Override Indicator */}
                        {overrideTotal ? (
                            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-0.5">
                                <div className="flex justify-between text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                                    <span>Manual Override Applied:</span>
                                    <span>{isOverrideInclusive ? 'Incl. GST' : 'Excl. GST'}</span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground line-through">
                                    <span>Calculated Rate:</span>
                                    <span>₹{(originalPriceDetails || details).totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        ) : null}

                        {/* Total Amount */}
                        <div className="flex justify-between items-center pt-2 border-t border-border">
                            <div>
                                <span className="font-black text-xs uppercase tracking-wider text-muted-foreground block">
                                    {overrideTotal ? 'Final Override Total' : 'TOTAL'}
                                </span>
                                {isInclusive && details.taxAmount > 0 && !overrideTotal && (
                                    <span className="text-[10px] text-emerald-600 font-semibold block">
                                        Includes ₹{details.taxAmount.toFixed(2)} GST ({details.taxRate}%)
                                    </span>
                                )}
                            </div>
                            <span className="text-xl font-black text-primary tracking-tight">
                                ₹{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Payment Status Summary */}
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium">Payment ({paymentMethod}):</span>
                            <span className="font-bold text-foreground">
                                {paymentOption === 'FULL' ? 'Full Payment' : `Deposit ₹${recordedPaid.toLocaleString()} (Bal: ₹${balanceDue.toLocaleString()})`}
                            </span>
                        </div>
                    </div>
                )}

                {/* Confirm & Create Booking CTA */}
                <button
                    type="submit"
                    form="create-booking-form"
                    disabled={!isReadyToBook || isSubmitting}
                    className="w-full mt-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 duration-200 cursor-pointer"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Creating Reservation...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-4 w-4" /> Confirm & Create Booking
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default BookingSummarySidebar;
