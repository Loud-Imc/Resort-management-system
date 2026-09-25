import { ExternalLink, Sparkles } from 'lucide-react';

interface ThirdPartyAdBannerProps {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaUrl?: string;
    imageUrl?: string;
    sponsorName?: string;
}

export default function ThirdPartyAdBanner({
    title = "Experience God's Own Country in Luxury",
    subtitle = "Explore exclusive Kerala Tourism board accredited backwater trails & misty hill retreats.",
    ctaText = "DISCOVER NOW",
    ctaUrl = "/properties?location=Wayanad",
    imageUrl = "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80",
    sponsorName = "Kerala Tourism Board"
}: ThirdPartyAdBannerProps) {
    return (
        <div className="bg-gradient-to-r from-emerald-900 via-primary-900 to-teal-950 rounded-3xl p-5 md:p-6 text-white shadow-lg overflow-hidden relative group">
            {/* Subtle decorative glow */}
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
                {/* Visual Thumbnail */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shadow-md flex-shrink-0 border border-white/15">
                        <img
                            src={imageUrl}
                            alt={sponsorName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                Sponsored
                            </span>
                            <span className="text-xs text-white/70 font-medium">• {sponsorName}</span>
                        </div>
                        <h3 className="text-base md:text-xl font-bold text-white tracking-tight leading-snug max-w-xl">
                            {title}
                        </h3>
                        <p className="text-xs text-white/80 mt-1 line-clamp-2 max-w-xl hidden sm:block">
                            {subtitle}
                        </p>
                    </div>
                </div>

                {/* CTA Action */}
                <div className="w-full md:w-auto flex items-center justify-end flex-shrink-0">
                    <a
                        href={ctaUrl}
                        className="w-full md:w-auto text-center px-6 py-3 rounded-full bg-white hover:bg-gray-100 text-gray-900 font-extrabold text-xs tracking-wider uppercase shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <span>{ctaText}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-600" />
                    </a>
                </div>
            </div>
        </div>
    );
}
