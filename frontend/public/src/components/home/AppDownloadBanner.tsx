import { useState } from 'react';
import { Smartphone, QrCode, ArrowRight, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AppDownloadBanner() {
    const [phone, setPhone] = useState('');
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length >= 10) {
            setIsSent(true);
            setTimeout(() => setIsSent(false), 4000);
        }
    };

    return (
        <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-teal-950 rounded-3xl p-6 md:p-8 text-white shadow-lg overflow-hidden relative">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                {/* Left Text */}
                <div className="flex items-center gap-5 w-full lg:w-auto">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-white/15">
                        <Smartphone className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-200 block mb-1">
                            Mobile Experience
                        </span>
                        <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                            Download the Oreedu App
                        </h3>
                        <p className="text-xs md:text-sm text-white/70 mt-1 max-w-md">
                            Get exclusive mobile-only discounts, offline booking vouchers, and live trip status updates.
                        </p>
                    </div>
                </div>

                {/* Right Form & QR Code */}
                <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto justify-end">
                    {/* Phone Input Form */}
                    <form onSubmit={handleSubmit} className="w-full sm:w-auto flex flex-col gap-2">
                        <span className="text-[11px] text-white/80 font-medium">Enter your mobile number to get the app link:</span>
                        <div className="flex items-center bg-white rounded-full p-1.5 pl-4 shadow-md w-full sm:w-80">
                            <span className="text-xs font-bold text-gray-500 mr-2">+91</span>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="Enter mobile number"
                                className="w-full bg-transparent text-xs font-bold text-gray-900 outline-none placeholder:text-gray-400 placeholder:font-normal"
                            />
                            <button
                                type="submit"
                                disabled={phone.length < 10 || isSent}
                                className="px-4 py-2 rounded-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs tracking-wider uppercase transition-all flex-shrink-0 cursor-pointer"
                            >
                                {isSent ? <Check className="h-4 w-4" /> : 'GET LINK'}
                            </button>
                        </div>
                        {isSent && (
                            <span className="text-[11px] text-emerald-400 font-semibold animate-in fade-in">
                                ✓ Link sent to +91 {phone}!
                            </span>
                        )}
                    </form>

                    {/* QR Code */}
                    <div className="hidden sm:flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex-shrink-0">
                        <div className="bg-white p-1.5 rounded-xl">
                            <QRCodeSVG value="https://oreedu.com/app" size={60} />
                        </div>
                        <div className="text-left">
                            <span className="text-[10px] text-white/60 block font-medium">Scan QR to</span>
                            <span className="text-xs font-bold text-white block">Download App</span>
                            <span className="text-[9px] text-primary-200 mt-0.5 block font-bold">iOS & Android</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
