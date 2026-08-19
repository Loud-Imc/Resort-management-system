import { useState, useEffect } from 'react';
import { otaService } from '../services/otaService';
import { Search, Loader2, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function OtaBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    let result = bookings;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          b.guestName.toLowerCase().includes(q) ||
          b.bookingNumber.toLowerCase().includes(q) ||
          (b.guestPhone && b.guestPhone.includes(q))
      );
    }
    if (statusFilter) {
      result = result.filter((b) => b.status === statusFilter);
    }
    setFiltered(result);
  }, [searchTerm, statusFilter, bookings]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await otaService.getBookings();
      setBookings(res);
    } catch (e: any) {
      toast.error('Failed to retrieve bookings list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please input a cancellation reason');
      return;
    }
    setIsCancelling(true);
    try {
      await otaService.cancelBooking(selectedBooking.id, cancelReason);
      toast.success('Reservation cancelled successfully');
      setIsCancelModalOpen(false);
      setSelectedBooking(null);
      setCancelReason('');
      fetchBookings();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to cancel reservation');
    } finally {
      setIsCancelling(false);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground">Reservations</h2>
          <p className="text-muted-foreground text-xs mt-0.5">List and inspect customer checkins and payment statuses.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search by name, phone, or reservation number..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl outline-none text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 bg-card border border-border rounded-xl text-muted-foreground text-xs font-semibold focus:ring-2 focus:ring-primary"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="RESERVED">Reserved</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="CHECKED_OUT">Checked Out</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Bookings Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase tracking-widest text-[9px] font-black bg-muted/20">
                <th className="p-4">Reservation #</th>
                <th className="p-4">Guest Info</th>
                <th className="p-4">Stay Dates</th>
                <th className="p-4">Room Category</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-bold italic">
                    No reservations matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-4 font-bold text-foreground">{b.bookingNumber}</td>
                    <td className="p-4">
                      <p className="font-extrabold text-foreground">{b.guestName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{b.guestPhone || b.guestEmail}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-foreground">
                        {format(new Date(b.checkInDate), 'dd MMM yyyy')} - {format(new Date(b.checkOutDate), 'dd MMM yyyy')}
                      </p>
                    </td>
                    <td className="p-4 font-semibold text-muted-foreground">{b.roomType?.name}</td>
                    <td className="p-4 text-right font-black text-foreground">₹{Number(b.totalAmount).toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        b.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        b.status === 'CHECKED_IN' ? 'bg-primary/15 text-primary border border-primary/20' :
                        b.status === 'CHECKED_OUT' ? 'bg-muted text-muted-foreground border border-border' :
                        b.status === 'RESERVED' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="py-1 px-3 bg-muted hover:bg-muted/80 text-foreground font-bold text-[10px] rounded-lg transition-colors border border-border cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute right-4 top-4 p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg border border-border"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="font-extrabold text-base text-foreground border-b border-border pb-3">
              Reservation details
            </h3>

            <div className="py-4 space-y-3.5 text-xs text-foreground">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Booking Number</p>
                  <p className="font-extrabold text-foreground mt-0.5">{selectedBooking.bookingNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Status</p>
                  <p className="font-extrabold text-primary mt-0.5">{selectedBooking.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Check In Date</p>
                  <p className="font-semibold text-foreground mt-0.5">{format(new Date(selectedBooking.checkInDate), 'dd MMMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Check Out Date</p>
                  <p className="font-semibold text-foreground mt-0.5">{format(new Date(selectedBooking.checkOutDate), 'dd MMMM yyyy')}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Primary Guest Name</p>
                <p className="font-bold text-foreground mt-0.5">{selectedBooking.guestName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Email Address</p>
                  <p className="font-semibold text-foreground mt-0.5">{selectedBooking.guestEmail || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Phone Contact</p>
                  <p className="font-semibold text-foreground mt-0.5">{selectedBooking.guestPhone || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Guests Count</p>
                  <p className="font-bold text-foreground mt-0.5">{selectedBooking.guestsCount || 1}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Booking Amount</p>
                  <p className="font-black text-emerald-500 mt-0.5">₹{Number(selectedBooking.totalAmount).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {selectedBooking.status !== 'CANCELLED' && (
              <div className="flex gap-3 justify-end border-t border-border pt-4 mt-2">
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  Cancel Booking
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancellation Modal Overlay */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="font-extrabold text-sm text-foreground">Cancel Reservation</h4>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Provide an official cancellation statement. This will trigger email updates to the guest.
            </p>
            <textarea
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground text-xs font-medium outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="e.g. Overbooking, guest requested cancel..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setIsCancelModalOpen(false); setCancelReason(''); }}
                className="px-3 py-1.5 bg-muted text-foreground border border-border font-bold text-xs rounded-xl cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="px-4 py-1.5 bg-rose-650 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
