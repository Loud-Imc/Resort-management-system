import { useState, useEffect } from 'react';
import { otaService } from '../services/otaService';
import { Loader2, Search, ChevronRight, User, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function OtaGuests() {
  const [guests, setGuests] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Scoped details modal
  const [selectedGuestKey, setSelectedGuestKey] = useState<string | null>(null);
  const [guestDetails, setGuestDetails] = useState<any>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      setFiltered(
        guests.filter(
          (g) =>
            g.name.toLowerCase().includes(q) ||
            g.email.toLowerCase().includes(q) ||
            g.phone.includes(q)
        )
      );
    } else {
      setFiltered(guests);
    }
  }, [searchTerm, guests]);

  useEffect(() => {
    if (selectedGuestKey) {
      fetchGuestDetails(selectedGuestKey);
    } else {
      setGuestDetails(null);
    }
  }, [selectedGuestKey]);

  const fetchGuests = async () => {
    setIsLoading(true);
    try {
      const res = await otaService.getGuests();
      setGuests(res);
    } catch (e) {
      toast.error('Failed to retrieve guest directories');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGuestDetails = async (key: string) => {
    setIsDetailsLoading(true);
    try {
      const res = await otaService.getGuestDetails(key);
      setGuestDetails(res);
    } catch (e) {
      toast.error('Failed to load guest details history');
      setSelectedGuestKey(null);
    } finally {
      setIsDetailsLoading(false);
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
        <h2 className="text-xl font-black text-foreground">Guest Directory</h2>
        <p className="text-muted-foreground text-xs mt-0.5">Explore unified guest profiles and booking history logs.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          type="text"
          placeholder="Search guests by name, email, or phone number..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl outline-none text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Guests List */}
        <div className="lg:col-span-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden max-h-[500px]">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="font-extrabold text-xs text-muted-foreground uppercase tracking-widest">Profiles</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs font-semibold">
                No profiles matching criteria.
              </div>
            ) : (
              filtered.map((g) => (
                <button
                  key={g.userId || g.email || g.phone}
                  onClick={() => setSelectedGuestKey(g.userId || g.email || g.phone)}
                  className={`w-full text-left p-4 hover:bg-muted/40 transition-colors flex items-center justify-between border-none outline-none cursor-pointer ${
                    selectedGuestKey === (g.userId || g.email || g.phone) ? 'bg-muted/70' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground text-xs truncate">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{g.email || g.phone}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 ml-2" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Selected Guest Details */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col min-h-[300px]">
          {isDetailsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !guestDetails ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-12">
              <User className="h-10 w-10 text-muted-foreground/45 mb-2" />
              <p className="text-xs font-bold">Select a guest from the left sidebar to trace booking logs.</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col">
              {/* Profile Card Header */}
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-base shrink-0">
                  {guestDetails.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-base font-extrabold text-foreground leading-none">{guestDetails.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {guestDetails.email || 'No email registered'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {guestDetails.phone || 'No phone registered'}
                    </span>
                  </div>
                </div>
              </div>

              {/* History list */}
              <div className="space-y-3 flex-1">
                <h4 className="font-extrabold text-xs text-muted-foreground uppercase tracking-widest border-b border-border pb-2">
                  Stay Logs & Reservations
                </h4>

                <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
                  {guestDetails.history.map((h: any) => (
                    <div key={h.id} className="p-4 bg-muted/20 border border-border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-foreground">{h.bookingNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            h.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            h.status === 'CHECKED_IN' ? 'bg-primary/15 text-primary border border-primary/20' :
                            h.status === 'CHECKED_OUT' ? 'bg-muted text-muted-foreground border border-border' :
                            'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {h.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(h.checkInDate), 'dd MMM yyyy')} to {format(new Date(h.checkOutDate), 'dd MMM yyyy')}
                        </p>
                      </div>

                      <div className="sm:text-right">
                        <span className="text-[10px] font-bold text-muted-foreground block">{h.roomType}</span>
                        <span className="text-xs font-black text-foreground block mt-0.5">₹{Number(h.totalAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
