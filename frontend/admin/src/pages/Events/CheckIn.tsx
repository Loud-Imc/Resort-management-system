import { useState, useEffect, useRef } from 'react';
import {
    Search, CheckCircle, XCircle, Loader2,
    Ticket, User, Calendar, MapPin,
    Info, ShieldCheck, Camera, Keyboard, AlertTriangle
} from 'lucide-react';
import eventBookingAdminService, { EventBooking } from '../../services/eventBookings';
import { Html5QrcodeScanner } from 'html5-qrcode';
import clsx from 'clsx';

export default function CheckIn() {
    const [ticketId, setTicketId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<EventBooking | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [activeTab, setActiveTab] = useState<'manual' | 'camera'>('camera');
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (activeTab === 'camera') {
            const scanner = new Html5QrcodeScanner(
                'reader',
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render(
                (decodedText) => {
                    setTicketId(decodedText);
                    handleVerify(undefined, decodedText);
                },
                (_error) => {
                    // console.warn(error);
                }
            );

            scannerRef.current = scanner;
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
        };
    }, [activeTab]);

    const handleVerify = async (e?: React.FormEvent, manualId?: string) => {
        if (e) e.preventDefault();
        const idToVerify = manualId || ticketId;
        if (!idToVerify.trim()) return;

        try {
            setLoading(true);
            setError(null);
            setResult(null);
            setIsDuplicate(false);

            const data = await eventBookingAdminService.verifyTicket(idToVerify.trim().toUpperCase());
            setResult(data);
            setTicketId(''); // Clear for next scan
        } catch (err: any) {
            console.error('Verification failed', err);
            const message = err.response?.data?.message || 'Verification failed. Please check the Ticket ID.';
            setError(message);

            if (message.toLowerCase().includes('already used')) {
                setIsDuplicate(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Check-In</h1>
                        <p className="text-gray-500">Scan or enter Ticket IDs to verify attendance and mark as checked-in.</p>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('camera')}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                                activeTab === 'camera' ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Camera className="h-4 w-4" /> Camera
                        </button>
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                                activeTab === 'manual' ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Keyboard className="h-4 w-4" /> Manual
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Verification Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                            {activeTab === 'camera' ? (
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Scan QR Code</label>
                                    <div id="reader" className="overflow-hidden rounded-lg border border-gray-200"></div>
                                    <p className="text-[10px] text-center text-gray-400">Position the ticket QR code within the frame to scan automatically</p>
                                </div>
                            ) : (
                                <form onSubmit={handleVerify} className="space-y-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Manual Entry</label>
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
                            )}

                            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex gap-3">
                                    <Info className="h-5 w-5 text-blue-500 shrink-0" />
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Tickets are automatically marked as "Checked-In" once verified. This prevents multiple entries using the same ticket.
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
                                    {activeTab === 'camera' ? <Camera className="h-10 w-10 text-gray-300" /> : <Search className="h-10 w-10 text-gray-300" />}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    {activeTab === 'camera' ? 'Camera Ready' : 'Ready for Verification'}
                                </h3>
                                <p className="text-gray-500 max-w-sm">
                                    {activeTab === 'camera' ? 'Show the ticket QR code to the camera.' : 'Enter a Ticket ID on the left to begin.'}
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className={clsx(
                                "rounded-xl shadow-sm border p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95",
                                isDuplicate ? "bg-amber-50 border-amber-200" : "bg-white border-red-100"
                            )}>
                                <div className={clsx(
                                    "w-20 h-20 rounded-full flex items-center justify-center mb-6 text-white",
                                    isDuplicate ? "bg-amber-500" : "bg-red-500"
                                )}>
                                    {isDuplicate ? <AlertTriangle className="h-10 w-10" /> : <XCircle className="h-10 w-10 text-white" />}
                                </div>
                                <h3 className={clsx(
                                    "text-xl font-bold mb-2 uppercase tracking-tight",
                                    isDuplicate ? "text-amber-900" : "text-red-900"
                                )}>
                                    {isDuplicate ? 'ALREADY CHECKED IN' : 'INVALID TICKET'}
                                </h3>
                                <p className={clsx(
                                    "font-medium mb-6",
                                    isDuplicate ? "text-amber-700" : "text-red-600"
                                )}>
                                    {error}
                                </p>
                                <button
                                    onClick={() => setError(null)}
                                    className={clsx(
                                        "px-6 py-2 rounded-lg font-bold transition-all",
                                        isDuplicate ? "bg-amber-200 text-amber-800 hover:bg-amber-300" : "bg-red-100 text-red-700 hover:bg-red-200"
                                    )}
                                >
                                    Dismiss
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
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Event Title</label>
                                                <div className="flex items-center gap-3 text-gray-900 font-bold">
                                                    <Calendar className="h-5 w-5 text-primary-600" />
                                                    {result.event?.title}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Guest Information</label>
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
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Venue Location</label>
                                                <div className="flex items-center gap-3 text-gray-900 font-bold">
                                                    <MapPin className="h-5 w-5 text-primary-600" />
                                                    {result.event?.location}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Payment Status</label>
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
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confirmed Time</div>
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
