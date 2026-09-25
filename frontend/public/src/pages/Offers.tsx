import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Sparkles, Copy, Check, ArrowRight, ShieldCheck, Gift, Percent } from 'lucide-react';

interface OfferItem {
    id: string;
    category: 'all' | 'resorts' | 'villas' | 'bank' | 'seasonal';
    title: string;
    description: string;
    code: string;
    discount: string;
    validity: string;
    imageUrl: string;
    badgeText?: string;
    terms?: string[];
}

const ALL_OFFERS: OfferItem[] = [
    {
        id: '1',
        category: 'resorts',
        title: 'Monsoon Escape to Wayanad',
        description: 'Get flat 25% OFF on luxury forest resorts & treehouses across Wayanad. Minimum 2 nights booking.',
        code: 'MONSOON25',
        discount: 'Flat 25% OFF',
        validity: 'Valid till 30 Sep 2026',
        imageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=600&q=80',
        badgeText: 'Trending',
        terms: ['Valid on selected resorts', 'Non-refundable booking', 'Max discount ₹3,500']
    },
    {
        id: '2',
        category: 'villas',
        title: 'Private Pool Villa Bonanza',
        description: 'Book premium private pool villas in Munnar and enjoy complimentary chef-curated breakfast for 2.',
        code: 'VILLASTAY',
        discount: 'Save up to ₹3,000',
        validity: 'Valid till 15 Oct 2026',
        imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80',
        badgeText: 'Popular',
        terms: ['Applicable on villa accommodations', 'Minimum booking amount ₹10,000']
    },
    {
        id: '3',
        category: 'bank',
        title: 'HDFC & ICICI Card Special',
        description: 'Instant 15% discount on credit and debit cards on bookings above ₹4,999. Use promo code at checkout.',
        code: 'BANKOREEDU',
        discount: 'Instant 15% OFF',
        validity: 'Valid till 31 Dec 2026',
        imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=80',
        badgeText: 'Bank Offer',
        terms: ['Once per user per month', 'Valid on all properties']
    },
    {
        id: '4',
        category: 'seasonal',
        title: 'Weekend Group Getaways',
        description: 'Special pricing and complimentary campfire setup with barbecue dinner for groups of 6+.',
        code: 'GROUPFUN',
        discount: 'Up to 30% OFF',
        validity: 'Limited Stays',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
        badgeText: 'Limited',
        terms: ['Valid for bookings of 3+ rooms or whole villa buyouts']
    },
    {
        id: '5',
        category: 'resorts',
        title: 'Early Bird Winter Booking',
        description: 'Plan ahead for your December hill station holidays and lock in low seasonal rates today.',
        code: 'EARLYBIRD',
        discount: 'Flat ₹2,000 OFF',
        validity: 'Book by 31 Oct',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        badgeText: 'Early Bird',
        terms: ['Valid for stays between 1 Nov - 15 Jan']
    },
    {
        id: '6',
        category: 'villas',
        title: 'Workation & Extended Stays',
        description: 'Special rates for stays exceeding 7 nights with high-speed Wi-Fi, laundry, and daily meals.',
        code: 'WORKATION',
        discount: 'Flat 35% OFF',
        validity: 'Ongoing',
        imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
        badgeText: 'Long Stay',
        terms: ['Minimum 7 nights stay required']
    }
];

export default function Offers() {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const filtered = selectedCategory === 'all'
        ? ALL_OFFERS
        : ALL_OFFERS.filter(o => o.category === selectedCategory);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    return (
        <div className="bg-[#fafaf9] min-h-screen pt-24 md:pt-28 pb-16">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
                {/* Hero Header */}
                <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-teal-950 rounded-3xl p-8 md:p-12 text-white shadow-xl mb-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-emerald-300 mb-3">
                            <Gift className="h-3.5 w-3.5" />
                            <span>Exclusive Verified Promo Codes</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                            Oreedu Stays & Deals
                        </h1>
                        <p className="text-sm md:text-base text-white/80 mt-3 leading-relaxed">
                            Apply these exclusive promo codes at checkout to unlock guaranteed lowest rates on top resorts, private villas, and eco-homestays across Kerala.
                        </p>
                    </div>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-8">
                    {[
                        { id: 'all', label: 'All Deals' },
                        { id: 'resorts', label: 'Resorts' },
                        { id: 'villas', label: 'Villas & Homestays' },
                        { id: 'bank', label: 'Bank & Card Offers' },
                        { id: 'seasonal', label: 'Seasonal Deals' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedCategory(tab.id)}
                            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                selectedCategory === tab.id
                                    ? 'bg-primary-700 text-white shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 ring-1 ring-black/[0.04]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Offers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((offer) => (
                        <div
                            key={offer.id}
                            className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ring-1 ring-black/[0.04] flex flex-col justify-between"
                        >
                            <div>
                                <div className="relative h-48 overflow-hidden">
                                    <img
                                        src={offer.imageUrl}
                                        alt={offer.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>
                                    {offer.badgeText && (
                                        <span className="absolute top-3 left-3 bg-primary-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                                            {offer.badgeText}
                                        </span>
                                    )}
                                    <span className="absolute bottom-3 left-3 text-white font-black text-lg tracking-tight drop-shadow-sm">
                                        {offer.discount}
                                    </span>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
                                        {offer.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                        {offer.description}
                                    </p>

                                    {offer.terms && offer.terms.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
                                            {offer.terms.map((t, idx) => (
                                                <p key={idx} className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    {t}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 pt-0">
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div>
                                        <span className="text-[10px] text-gray-400 block font-medium">Coupon Code</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(offer.code)}
                                            className="flex items-center gap-1.5 text-xs font-mono font-bold text-gray-900 hover:text-primary-600 mt-0.5 cursor-pointer"
                                            title="Copy Code"
                                        >
                                            <span className="bg-primary-50 text-primary-800 px-2 py-0.5 rounded border border-dashed border-primary-200">
                                                {offer.code}
                                            </span>
                                            {copiedCode === offer.code ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5 text-gray-400" />
                                            )}
                                        </button>
                                    </div>

                                    <Link
                                        to="/properties"
                                        className="px-5 py-2 rounded-full bg-primary-700 hover:bg-primary-800 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                                    >
                                        <span>BOOK NOW</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
