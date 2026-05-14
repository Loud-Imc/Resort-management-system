import { useState, useEffect } from 'react';
import { useProperty } from '../../context/PropertyContext';
import { promotionsService } from '../../services/promotions';
import type { PromotionRequest, AvailabilityResponse } from '../../services/promotions';
import { Loader2, Rocket, CheckCircle, Calendar, Clock, TrendingUp, Sparkles, X, Lock } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'react-hot-toast';

// Extend window object for Razorpay integration
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PromotionsConsole() {
  const { selectedProperty } = useProperty();
  const [requests, setRequests] = useState<PromotionRequest[]>([]);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PromotionRequest | null>(null);
  const [payingSimulated, setPayingSimulated] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    type: 'HOMEPAGE_FEATURED',
    startDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 8), 'yyyy-MM-dd'),
  });

  // Load standard Razorpay payment runtime client
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedProperty?.id) {
      loadData();
    }
  }, [selectedProperty]);

  const loadData = async () => {
    if (!selectedProperty?.id) return;
    try {
      setLoading(true);
      const [reqs, avail] = await Promise.all([
        promotionsService.getAll({ propertyId: selectedProperty.id }),
        promotionsService.getAvailability(selectedProperty.id),
      ]);
      setRequests(reqs);
      setAvailability(avail);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty?.id) return;

    try {
      setSubmitting(true);
      await promotionsService.submit(selectedProperty.id, formData);
      toast.success('Proposal submitted successfully! Admin will quote price soon.');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit request. Overlapping campaigns exist.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentTarget) return;
    
    if (typeof window.Razorpay === 'undefined') {
      toast.error('The payment gateway client failed to load. Check your network and try again.');
      return;
    }

    try {
      setPayingSimulated(true);
      toast.loading('Connecting to Razorpay gateway...', { id: 'pay-process' });

      // 1. Establish Order ID in backend ledger
      const orderData = await promotionsService.initiatePayment(paymentTarget.id);

      // 2. Populate client pre-fills if local user storage is cached
      let prefill = {};
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          prefill = {
            name: `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || 'Owner',
            email: userObj.email,
            contact: userObj.phone,
          };
        } catch (e) {
          // Swallow parsing bugs
        }
      }

      // 3. Construct visual integration SDK configs
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Route Guide',
        description: `Regional Boost: ${paymentTarget.type === 'HOMEPAGE_FEATURED' ? 'Home Featured' : 'Search Highlight'}`,
        order_id: orderData.orderId,
        prefill,
        theme: {
          color: '#10b981', // Theme Emerald
        },
        handler: async function (response: any) {
          try {
            toast.loading('Validating cryptographic receipt...', { id: 'pay-process' });
            
            // 4. Transmit signature parameters back to NestJS validators
            await promotionsService.verifyPayment(paymentTarget.id, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            toast.success('Transaction Captured Successfully! Campaign is Live! 🚀', { id: 'pay-process' });
            setPaymentTarget(null);
            loadData();
          } catch (error: any) {
            console.error('Signature verification rejected:', error);
            toast.error(error.response?.data?.message || 'Failed to confirm signature with backend.', { id: 'pay-process' });
          } finally {
            setPayingSimulated(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPayingSimulated(false);
            toast.dismiss('pay-process');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err: any) {
      console.error('Failed to bind checkout runtime:', err);
      toast.error(err.response?.data?.message || 'Payment Initiation Failed. Contact Admin.', { id: 'pay-process' });
      setPayingSimulated(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'WAITLISTED':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'PAYMENT_PENDING':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 animate-pulse';
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (!selectedProperty) {
    return (
      <div className="p-8 text-center bg-card rounded-3xl border border-border/50">
        <Rocket className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-black text-foreground">No Property Selected</h3>
        <p className="text-muted-foreground text-sm font-medium">Please select a property from the sidebar list to manage boosts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2 text-foreground">
      {/* Top Header Widget */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 rounded-3xl shadow-xl p-8 text-white">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-20 -translate-y-20">
          <Rocket className="w-96 h-96" />
        </div>

        <div className="relative z-10">
          <span className="bg-white/20 border border-white/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            📊 Growth Engine
          </span>
          <h1 className="text-3xl font-black mt-4 tracking-tight">Increase Bookings with Boosters</h1>
          <p className="text-white/80 text-sm mt-2 max-w-xl font-medium">
            Feature your property on the main homepage slider or float directly to the top of search results in your district.
          </p>
        </div>

        {availability && (
          <div className="relative z-10 mt-8 flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 flex-1 min-w-[220px]">
              <div className="bg-white/20 p-3 rounded-xl">
                <Sparkles className="h-6 w-6 text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-black tracking-wider opacity-75 text-white">Featured Slots ({availability.city})</div>
                <div className="text-2xl font-black text-white">{availability.activeCount} / 3 Filled</div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 flex-1 min-w-[220px]">
              <div className="bg-white/20 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-black tracking-wider opacity-75 text-white">District Status</div>
                <div className="text-base font-black text-white mt-1">
                  {availability.isFull ? '🔴 Full (Waitlist Active)' : '🟢 Slots Available Now'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Request Submission Column */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-muted/50 flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                <h2 className="font-black text-foreground uppercase text-xs tracking-widest">Propose New Booster</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">Placement Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'HOMEPAGE_FEATURED' })}
                      className={`p-4 border rounded-xl text-left transition-all duration-200 flex flex-col justify-between h-28 ${
                        formData.type === 'HOMEPAGE_FEATURED'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
                          : 'border-border bg-background hover:border-muted-foreground/30'
                      }`}
                    >
                      <Sparkles className={`h-5 w-5 ${formData.type === 'HOMEPAGE_FEATURED' ? 'text-primary fill-current' : 'text-muted-foreground/60'}`} />
                      <div>
                        <span className="block text-xs font-bold text-foreground">Home Featured</span>
                        <span className="block text-[9px] text-muted-foreground mt-0.5 font-medium">Exact 3 Per Region</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'SEARCH_SPONSORED' })}
                      className={`p-4 border rounded-xl text-left transition-all duration-200 flex flex-col justify-between h-28 ${
                        formData.type === 'SEARCH_SPONSORED'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
                          : 'border-border bg-background hover:border-muted-foreground/30'
                      }`}
                    >
                      <TrendingUp className={`h-5 w-5 ${formData.type === 'SEARCH_SPONSORED' ? 'text-primary' : 'text-muted-foreground/60'}`} />
                      <div>
                        <span className="block text-xs font-bold text-foreground">Search Boosted</span>
                        <span className="block text-[9px] text-muted-foreground mt-0.5 font-medium">Unlimited Slots</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">Start Date</label>
                    <input
                      type="date"
                      required
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full border border-border bg-background text-foreground rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">End Date</label>
                    <input
                      type="date"
                      required
                      min={formData.startDate}
                      className="w-full border border-border bg-background text-foreground rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-widest py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit For Quote'}
                </button>
              </form>
            </div>
          </div>

          {/* Current Campaigns Console */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-muted/50">
                <h2 className="font-black text-foreground uppercase text-xs tracking-widest">Your Campaign Stream</h2>
              </div>
              <div className="p-6">
                {requests.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm font-medium">No promotion campaigns active or submitted yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((req) => (
                      <div key={req.id} className="border border-border bg-muted/10 rounded-2xl p-5 hover:border-primary/50 hover:shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl border ${getStatusStyle(req.status)}`}>
                            {req.type === 'HOMEPAGE_FEATURED' ? <Sparkles className="h-6 w-6 fill-current" /> : <TrendingUp className="h-6 w-6" />}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-foreground">{req.type === 'HOMEPAGE_FEATURED' ? 'Home Featured' : 'Search Boosted'}</span>
                              <span className={`text-[9px] font-black uppercase border px-2.5 py-0.5 rounded-full ${getStatusStyle(req.status)}`}>
                                {req.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(req.startDate), 'dd MMM')} - {format(new Date(req.endDate), 'dd MMM yyyy')}
                            </div>
                            {req.price && Number(req.price) > 0 && (
                              <div className="text-sm font-black text-foreground mt-2">Price Quote: ₹{Number(req.price).toLocaleString()}</div>
                            )}
                          </div>
                        </div>

                        {/* Dynamic CTAs based on status */}
                        <div>
                          {req.status === 'PAYMENT_PENDING' && (
                            <div className="flex flex-col items-end gap-2">
                              <button
                                onClick={() => setPaymentTarget(req)}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md transition-all"
                              >
                                💳 Pay & Activate Now
                              </button>
                              {req.paymentDeadline && (
                                <span className="text-[9px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">
                                  Expires: {format(new Date(req.paymentDeadline), 'dd MMM hh:mm a')}
                                </span>
                              )}
                            </div>
                          )}

                          {req.status === 'ACTIVE' && (
                            <div className="flex flex-col items-end text-emerald-600 dark:text-emerald-400">
                              <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5 fill-current" /> Live & Running
                              </span>
                            </div>
                          )}

                          {req.status === 'WAITLISTED' && (
                            <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 border border-purple-500/20 rounded-lg">
                              ⏳ Queued in Waitlist
                            </span>
                          )}
                          
                          {req.status === 'PENDING_APPROVAL' && (
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 border border-amber-500/20 rounded-lg">
                              👀 In Review
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
      {/* Premium Simulated Secure Checkout Gateway */}
      {paymentTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card text-foreground rounded-3xl shadow-2xl border border-border overflow-hidden relative animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-emerald-600 dark:bg-emerald-700 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Secure Payment</h3>
                  <p className="text-[10px] text-emerald-100 font-medium">Powered by Route Guide Payments</p>
                </div>
              </div>
              <button 
                onClick={() => setPaymentTarget(null)} 
                className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="p-6 border-b border-border bg-muted/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Subscription For</span>
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    {paymentTarget.type === 'HOMEPAGE_FEATURED' ? <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-current" /> : <TrendingUp className="h-3.5 w-3.5 text-blue-500" />}
                    {paymentTarget.type === 'HOMEPAGE_FEATURED' ? 'Home Featured Slot' : 'Search Boosting Bundle'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Payable</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">₹{Number(paymentTarget.price).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-xl px-3 py-2 font-medium flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Active: {format(new Date(paymentTarget.startDate), 'dd MMM')} - {format(new Date(paymentTarget.endDate), 'dd MMM yyyy')}
              </div>
            </div>

            {/* Invoice Generated Notice */}
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 text-center">
                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="text-sm font-bold text-foreground mb-1">Invoice Generated</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your promotion request has been approved. Proceed to the secure payment gateway to finalize your booking.
                </p>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-6 bg-muted/30 border-t border-border">
              <button
                onClick={handleConfirmPayment}
                disabled={payingSimulated}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer active:scale-95"
              >
                {payingSimulated ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="h-4 w-4 fill-current" />
                    Authorize & Pay Now
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-muted-foreground mt-3 font-medium px-2">
                By authorizing, your slot assets will be instantly provisioned across our high-traffic homepage grids.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
