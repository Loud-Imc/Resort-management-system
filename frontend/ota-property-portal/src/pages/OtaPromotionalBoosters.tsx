import { useState } from 'react';
import { otaService } from '../services/otaService';
import { Loader2, Sparkles, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OtaPromotionalBoosters() {
  const [tier, setTier] = useState<'FEATURED' | 'TOP_RECOMMENDED'>('FEATURED');
  const [days, setDays] = useState('7');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const boosterTiers = [
    {
      key: 'FEATURED',
      title: 'Featured Spot',
      desc: 'Highlights your property with a special "Featured" badge at the top of guest search directories.',
      pricePerDay: 499,
    },
    {
      key: 'TOP_RECOMMENDED',
      title: 'Top Recommended List',
      desc: 'Boosts your property on our dedicated recommended page, and injects your hotel card in post-booking guest emails.',
      pricePerDay: 899,
    },
  ];

  const handleBoost = async () => {
    setIsSubmitting(true);
    try {
      // 1. Submit promotion request to get request ID
      const request = await otaService.requestPromotion({
        tier,
        days: parseInt(days),
      });

      // 2. Initiate payment for this promotion request to get Razorpay order parameters
      const order = await otaService.initiatePromotionPayment(request.id);

      // Load Razorpay Checkout dynamically
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error('Razorpay SDK failed to load. Please check your internet connection.');
        setIsSubmitting(false);
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'RouteGuide Promotions',
        description: `${tier.replace('_', ' ')} Campaign Booster`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await otaService.verifyPromotionPayment(request.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Campaign Booster activated successfully! Your listing is now promoted.', { duration: 5000 });
          } catch (err) {
            toast.error('Payment verification failed.');
          }
        },
        prefill: {
          name: 'Resort Partner',
        },
        theme: {
          color: '#08474e',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to place campaign request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const selectedTierConfig = boosterTiers.find((t) => t.key === tier)!;
  const totalAmount = selectedTierConfig.pricePerDay * parseInt(days);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <div>
        <h2 className="text-xl font-black text-foreground">Promotional Boosters</h2>
        <p className="text-muted-foreground text-xs mt-0.5">Feature and highlight your property to guests in search results.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Cards Selector */}
        <div className="lg:col-span-2 space-y-4">
          {boosterTiers.map((b) => {
            const isSelected = tier === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setTier(b.key as any)}
                className={`w-full p-5 rounded-2xl text-left border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-primary/5 border-primary shadow-md' 
                    : 'bg-card border-border hover:bg-muted/30'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`h-4.5 w-4.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-extrabold text-sm text-foreground">{b.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-lg">{b.desc}</p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Rate</span>
                  <span className="text-base font-black text-primary block mt-0.5">₹{b.pricePerDay} / day</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Campaign Order Panel */}
        <div className="lg:col-span-1">
          <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4 text-xs text-foreground">
            <h3 className="font-extrabold text-sm text-foreground">Campaign Summary</h3>

            <div className="space-y-3.5 border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Selected Booster</p>
                <p className="font-bold text-foreground mt-0.5">{selectedTierConfig.title}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Duration (Days)</label>
                <select
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-muted-foreground font-semibold"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                >
                  <option value="3">3 Days Campaign</option>
                  <option value="7">7 Days Campaign (Recommended)</option>
                  <option value="15">15 Days Campaign</option>
                  <option value="30">30 Days Campaign</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 border-b border-border pb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">Rate</span>
                <span className="font-bold text-foreground">₹{selectedTierConfig.pricePerDay} × {days} days</span>
              </div>
              <div className="flex justify-between text-sm font-black">
                <span className="text-foreground">Total Checkout</span>
                <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleBoost}
              disabled={isSubmitting}
              className="w-full py-3 bg-primary hover:opacity-90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <CreditCard className="h-4.5 w-4.5" />
              )}
              <span>{isSubmitting ? 'Securing Transaction...' : 'Pay with Razorpay'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
