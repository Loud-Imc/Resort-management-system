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
                        <h1 className="text-2xl font-bold text-foreground mb-2">Event Check-In</h1>
                        <p className="text-muted-foreground font-medium">Scan or enter Ticket IDs to verify attendance and mark as checked-in.</p>
                    </div>

                    <div className="flex bg-muted p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('camera')}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
                                activeTab === 'camera' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Camera className="h-4 w-4" /> Camera
                        </button>
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
                                activeTab === 'manual' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Keyboard className="h-4 w-4" /> Manual
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Verification Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-card rounded-xl shadow-sm border border-border p-6 sticky top-6">
                            {activeTab === 'camera' ? (
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Scan QR Code</label>
                                    <div id="reader" className="overflow-hidden rounded-xl border border-border bg-muted/20"></div>
                                    <p className="text-[10px] text-center text-muted-foreground font-medium">Position the ticket QR code within the frame to scan automatically</p>
                                </div>
                            ) : (
                                <form onSubmit={handleVerify} className="space-y-4">
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Manual Entry</label>
                                    <div className="relative">
                                        <Ticket className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={ticketId}
                                            onChange={(e) => setTicketId(e.target.value)}
                                            placeholder="BK-EVT-XXXXXX"
                                            className="w-full pl-10 pr-4 py-3 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none uppercase font-mono tracking-widest font-black"
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || !ticketId.trim()}
                                        className="w-full py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
                                    >
                                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-5 w-5" /> Verify Ticket</>}
                                    </button>
                                </form>
                            )}

                            <div className="mt-8 p-4 bg-primary/10 rounded-xl border border-primary/20">
                                <div className="flex gap-3">
                                    <Info className="h-5 w-5 text-primary shrink-0" />
                                    <p className="text-xs text-primary/80 leading-relaxed font-bold">
                                        Tickets are automatically marked as "Checked-In" once verified. This prevents multiple entries using the same ticket.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result Display */}
                    <div className="lg:col-span-2">
                        {loading && !result && (
                            <div className="bg-card rounded-xl shadow-sm border border-border p-12 flex flex-col items-center justify-center text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary/30 mb-4" />
                                <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">Querying Ticket Database...</p>
                            </div>
                        )}

                        {!loading && !result && !error && (
                            <div className="bg-card rounded-xl shadow-sm border border-border p-12 flex flex-col items-center justify-center text-center opacity-60">
                                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                                    {activeTab === 'camera' ? <Camera className="h-10 w-10 text-muted-foreground" /> : <Search className="h-10 w-10 text-muted-foreground" />}
                                </div>
                                <h3 className="text-lg font-black text-foreground mb-1 uppercase tracking-tight">
                                    {activeTab === 'camera' ? 'Camera Ready' : 'Ready for Verification'}
                                </h3>
                                <p className="text-muted-foreground max-w-sm font-medium">
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
                                    "w-20 h-20 rounded-full flex items-center justify-center mb-6 text-white shadow-lg",
                                    isDuplicate ? "bg-amber-500 shadow-amber-500/20" : "bg-destructive shadow-destructive/20"
                                )}>
                                    {isDuplicate ? <AlertTriangle className="h-10 w-10" /> : <XCircle className="h-10 w-10 text-white" />}
                                </div>
                                <h3 className={clsx(
                                    "text-xl font-black mb-2 uppercase tracking-tight",
                                    isDuplicate ? "text-amber-500" : "text-destructive"
                                )}>
                                    {isDuplicate ? 'ALREADY CHECKED IN' : 'INVALID TICKET'}
                                </h3>
                                <p className={clsx(
                                    "font-bold mb-6",
                                    isDuplicate ? "text-amber-500/70" : "text-destructive/70"
                                )}>
                                    {error}
                                </p>
                                <button
                                    onClick={() => setResult(null)}
                                    className={clsx(
                                        "px-8 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-sm",
                                        isDuplicate ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                    )}
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {result && (
                            <div className="bg-card rounded-xl shadow-sm border border-emerald-500/20 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-emerald-500 p-6 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/20 p-2 rounded-full shadow-inner">
                                            <CheckCircle className="h-8 w-8 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight">Verification Successful</h3>
                                            <p className="text-emerald-50/80 text-xs font-bold uppercase tracking-widest">Guest is cleared for entry</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-white/60 uppercase tracking-widest">Ticket ID</div>
                                        <div className="font-mono font-black text-xl">{result.ticketId}</div>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Event Title</label>
                                                <div className="flex items-center gap-3 text-foreground font-black">
                                                    <Calendar className="h-5 w-5 text-primary" />
                                                    {result.event?.title}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Guest Information</label>
                                                <div className="flex items-center gap-3 text-foreground font-black mb-1">
                                                    <User className="h-5 w-5 text-primary" />
                                                    {result.guestName || 'Registered Guest'}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-bold ml-8">{result.guestEmail}</div>
                                                {result.guestPhone && <div className="text-xs text-muted-foreground font-bold ml-8">{result.guestPhone}</div>}
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Venue Location</label>
                                                <div className="flex items-center gap-3 text-foreground font-black">
                                                    <MapPin className="h-5 w-5 text-primary" />
                                                    {result.event?.location}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Payment Status</label>
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                    <CheckCircle className="h-3 w-3" />
                                                    {result.status === 'PAID' ? 'PAID IN FULL' : result.status}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-border flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-500 font-black uppercase tracking-widest text-xs">
                                            <ShieldCheck className="h-5 w-5" />
                                            Marked as Checked-In
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Confirmed Time</div>
                                            <div className="text-sm font-black text-foreground">{new Date(result.checkInTime!).toLocaleTimeString()}</div>
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
