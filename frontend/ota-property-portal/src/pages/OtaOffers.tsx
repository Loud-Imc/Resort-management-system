import { useState, useEffect } from 'react';
import { otaService } from '../services/otaService';
import { Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function OtaOffers() {
  const [offers, setOffers] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRoomTypeIds, setSelectedRoomTypeIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [offersRes, typesRes] = await Promise.all([
        otaService.getOffers(),
        otaService.getRoomTypes(),
      ]);
      setOffers(offersRes);
      setRoomTypes(typesRes);
    } catch (e) {
      toast.error('Failed to load campaigns list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRoomType = (id: string) => {
    if (selectedRoomTypeIds.includes(id)) {
      setSelectedRoomTypeIds(selectedRoomTypeIds.filter((x) => x !== id));
    } else {
      setSelectedRoomTypeIds([...selectedRoomTypeIds, id]);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !discountValue || selectedRoomTypeIds.length === 0) {
      toast.error('Please fill out all mandatory fields and map at least one Room Type');
      return;
    }
    setIsSaving(true);
    try {
      await otaService.createOffer({
        name,
        description,
        discountType: 'PERCENTAGE',
        discountValue: parseFloat(discountValue),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        roomTypeIds: selectedRoomTypeIds,
      });
      toast.success('Offer created successfully');
      setName('');
      setDescription('');
      setDiscountValue('');
      setSelectedRoomTypeIds([]);
      fetchInitialData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to construct offer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm('Delete this marketing campaign?')) return;
    try {
      await otaService.deleteOffer(id);
      toast.success('Campaign removed successfully');
      fetchInitialData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove campaign');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <div>
        <h2 className="text-xl font-black text-foreground">Offers & Marketing Campaigns</h2>
        <p className="text-muted-foreground text-xs mt-0.5">Configure early-bird and last-minute percentage discount vouchers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Create Offer */}
        <div className="lg:col-span-1">
          <form onSubmit={handleCreateOffer} className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4 text-xs text-foreground">
            <h3 className="font-extrabold text-sm text-foreground">Launch New Campaign</h3>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Offer Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Monsoon Special Promo"
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Description</label>
              <textarea
                placeholder="Details of the campaign (e.g. valid on weekends)..."
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-medium"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Discount (%)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Start Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-bold"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">End Date</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-bold"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block mb-1">Applicable Room Types</label>
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto p-1 bg-muted/20 border border-border rounded-xl">
                {roomTypes.map((rt) => {
                  const selected = selectedRoomTypeIds.includes(rt.id);
                  return (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => handleSelectRoomType(rt.id)}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-[10px] transition-colors cursor-pointer border ${
                        selected 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
                      }`}
                    >
                      {rt.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-primary hover:opacity-90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Launch Campaign</span>
            </button>
          </form>
        </div>

        {/* Right column: Current active campaigns */}
        <div className="lg:col-span-2 p-6 bg-card border border-border rounded-2xl shadow-sm flex flex-col">
          <h3 className="font-extrabold text-sm text-foreground mb-4">Active & Scheduled Offers</h3>

          <div className="flex-1 overflow-x-auto">
            {offers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-10 text-center">No discount campaigns active.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase tracking-widest text-[9px] font-black pb-3">
                    <th className="pb-3">Campaign</th>
                    <th className="pb-3">Voucher Period</th>
                    <th className="pb-3 text-right">Value</th>
                    <th className="pb-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {offers.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-2">
                        <p className="font-bold text-foreground">{o.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{o.description || 'No description.'}</p>
                      </td>
                      <td className="py-3 pr-2">
                        <p className="font-medium text-foreground">
                          {format(new Date(o.startDate), 'dd MMM')} - {format(new Date(o.endDate), 'dd MMM yyyy')}
                        </p>
                      </td>
                      <td className="py-3 pr-2 text-right font-black text-primary">-{o.discountValue}%</td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleDeleteOffer(o.id)}
                          className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg border border-border cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
