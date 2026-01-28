import { useState } from 'react';
import {
    Search, CheckCircle, XCircle, Loader2,
    Ticket, User, Calendar, MapPin,
    Info, ShieldCheck
} from 'lucide-react';
import eventBookingAdminService, { EventBooking } from '../../services/eventBookings';

export default function CheckIn() {
    const [ticketId, setTicketId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<EventBooking | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!ticketId.trim()) return;

        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const data = await eventBookingAdminService.verifyTicket(ticketId.trim().toUpperCase());
            setResult(data);
            setTicketId(''); // Clear for next scan
        } catch (err: any) {
            console.error('Verification failed', err);
            setError(err.response?.data?.message || 'Verification failed. Please check the Ticket ID.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Check-In</h1>
                    <p className="text-gray-500">Scan or enter Ticket IDs to verify attendance and mark as checked-in.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Verification Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                            <label className="block text-sm font-bold text-gray-700 mb-4">Verification Entry</label>
                            <form onSubmit={handleVerify} className="space-y-4">
                                <div className="relative">
                                    <Ticket className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={ticketId}
                                        onChange={(e) => setTicketId(e.target.value)}
                                        placeholder="BK-EVT-XXXXXX"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none uppercase font-mono tracking-wider"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !ticketId.trim()}
                                    className="w-full py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-5 w-5" /> Verify Ticket</>}
                                </button>
                            </form>

                            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex gap-3">
                                    <Info className="h-5 w-5 text-blue-500 shrink-0" />
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Tickets are automatically marked as "Checked-In" once verified. This action cannot be undone manually from this interface.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result Display */}
                    <div className="lg:col-span-2">
                        {loading && !result && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary-200 mb-4" />
                                <p className="text-gray-500 font-medium">Querying Ticket Database...</p>
                            </div>
                        )}

                        {!loading && !result && !error && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center opacity-60">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <Search className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Ready for Verification</h3>
                                <p className="text-gray-500 max-w-sm">Scan a QR code or enter a Ticket ID on the left to begin.</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-white rounded-xl shadow-sm border border-red-100 p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                                    <XCircle className="h-10 w-10 text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-red-900 mb-2">Invalid Ticket</h3>
                                <p className="text-red-600 font-medium mb-6">{error}</p>
                                <button
                                    onClick={() => setError(null)}
                                    className="px-6 py-2 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition-all"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {result && (
                            <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-green-500 p-6 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/20 p-2 rounded-full">
                                            <CheckCircle className="h-8 w-8 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">Verification Successful</h3>
                                            <p className="text-green-50/80 text-sm font-medium">Guest is cleared for entry</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Ticket ID</div>
                                        <div className="font-mono font-bold">{result.ticketId}</div>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Event Title</label>
                                                <div className="flex items-center gap-3 text-gray-900 font-bold">
                                                    <Calendar className="h-5 w-5 text-primary-600" />
                                                    {result.event?.title}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Guest Information</label>
                                                <div className="flex items-center gap-3 text-gray-900 font-bold mb-1">
                                                    <User className="h-5 w-5 text-primary-600" />
                                                    {result.guestName || 'Registered Guest'}
                                                </div>
                                                <div className="text-sm text-gray-500 ml-8">{result.guestEmail}</div>
                                                {result.guestPhone && <div className="text-sm text-gray-500 ml-8">{result.guestPhone}</div>}
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Venue Location</label>
                                                <div className="flex items-center gap-3 text-gray-900 font-bold">
                                                    <MapPin className="h-5 w-5 text-primary-600" />
                                                    {result.event?.location}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Payment Status</label>
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold ring-1 ring-inset ring-green-600/20">
                                                    <CheckCircle className="h-3 w-3" />
                                                    {result.status === 'PAID' ? 'PAID IN FULL' : result.status}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-green-600 font-bold">
                                            <ShieldCheck className="h-5 w-5" />
                                            Marked as Checked-In
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</div>
                                            <div className="text-sm font-bold text-gray-700">{new Date(result.checkInTime!).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
