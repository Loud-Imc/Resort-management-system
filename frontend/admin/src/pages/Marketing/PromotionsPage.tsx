import { useState, useEffect } from 'react';
import { promotionsService } from '../../services/promotions';
import type { PromotionRequest } from '../../services/promotions';
import { Loader2, Megaphone, CheckCircle, XCircle, Clock, AlertCircle, Filter, MapPin, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function PromotionsPage() {
  const [requests, setRequests] = useState<PromotionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('PENDING_APPROVAL');
  
  // Approval Modal State
  const [selectedRequest, setSelectedRequest] = useState<PromotionRequest | null>(null);
  const [priceQuote, setPriceQuote] = useState<string>('2500');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await promotionsService.getAll({
        status: activeTab === 'ALL' ? undefined : activeTab
      });
      setRequests(data);
    } catch (error) {
      console.error('Failed to load promotions', error);
      toast.error('Failed to load promotion requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (req: PromotionRequest) => {
    setSelectedRequest(req);
    setPriceQuote('2500'); // Default fallback
  };

  const submitApproval = async () => {
    if (!selectedRequest) return;
    try {
      setSubmitting(true);
      await promotionsService.approve(selectedRequest.id, Number(priceQuote));
      toast.success('Request processed successfully!');
      setSelectedRequest(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Are you sure you want to reject this promotion request?')) return;
    try {
      await promotionsService.reject(id);
      toast.success('Request rejected.');
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
      case 'WAITLISTED':
        return (
          <span className="inline-flex items-center gap-1 text-purple-600 bg-purple-500/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Filter className="h-3 w-3" /> Waitlisted
          </span>
        );
      case 'PAYMENT_PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <AlertCircle className="h-3 w-3" /> Invoice Sent
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
            <CheckCircle className="h-3 w-3" /> Active
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-500/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <XCircle className="h-3 w-3" /> Expired
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const tabs = [
    { value: 'PENDING_APPROVAL', label: 'New Requests' },
    { value: 'WAITLISTED', label: 'Waitlist' },
    { value: 'PAYMENT_PENDING', label: 'Awaiting Payment' },
    { value: 'ACTIVE', label: 'Active Boosts' },
    { value: 'ALL', label: 'History Archive' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="text-primary h-6 w-6" />
            Promotion Moderation
          </h1>
          <p className="text-muted-foreground font-medium">Manage district homepage slot bidding and regional campaign boosts.</p>
        </div>
      </div>

      {/* Custom Styled Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-200 ${
              activeTab === tab.value
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Property & Region</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Type</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Duration</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Quoted Price</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Status</th>
                {activeTab === 'PENDING_APPROVAL' && (
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                    No promotion requests found in this category.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-card-foreground">{req.property.name}</div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                        <MapPin className="h-3 w-3 text-primary" />
                        {req.property.city}, {req.property.state}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${
                        req.type === 'HOMEPAGE_FEATURED' 
                          ? 'bg-amber-500/10 text-amber-600' 
                          : 'bg-indigo-500/10 text-indigo-600'
                      }`}>
                        <Sparkles className="h-3 w-3 fill-current" />
                        {req.type === 'HOMEPAGE_FEATURED' ? 'Home Featured' : 'Search Boosted'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-muted-foreground">
                      <div>{format(new Date(req.startDate), 'dd MMM yyyy')}</div>
                      <div className="text-[9px] opacity-60">to</div>
                      <div>{format(new Date(req.endDate), 'dd MMM yyyy')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-card-foreground text-base">
                        ₹{Number(req.price) > 0 ? Number(req.price).toLocaleString() : '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    {activeTab === 'PENDING_APPROVAL' && (
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleReject(req.id)}
                          className="px-3 py-1.5 border border-border hover:bg-muted hover:text-destructive rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveClick(req)}
                          className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-primary/20"
                        >
                          Set Price & Approve
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dynamic Quote Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-black text-card-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Approve Placement
              </h2>
              <button 
                onClick={() => setSelectedRequest(null)} 
                className="text-muted-foreground hover:text-foreground text-xl font-bold"
              >&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-muted/50 p-4 rounded-xl border border-border">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Property</div>
                <div className="font-bold text-sm">{selectedRequest.property.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{selectedRequest.property.city} ({selectedRequest.type})</div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                  Manually Set Seasonal Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground">₹</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-3 bg-background border border-border rounded-xl text-lg font-black outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    value={priceQuote}
                    min="0"
                    onChange={(e) => setPriceQuote(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">
                  💡 Set a custom price based on local season. If the regional featured capacity (Max 3) is already filled, this property will naturally drop into the district's Waitlist.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-4">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 py-2 text-xs font-black uppercase tracking-wider border border-border hover:bg-muted rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={submitApproval}
                  disabled={submitting}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm Quote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
