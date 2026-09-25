import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag, ArrowRight, Copy, Check, Sparkles } from 'lucide-react';

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
}

const OFFERS_DATA: OfferItem[] = [
    {
        id: '1',
        category: 'resorts',
        title: 'Monsoon Escape to Wayanad',
        description: 'Get flat 25% OFF on luxury forest resorts & treehouses across Wayanad.',
        code: 'MONSOON25',
        discount: 'Flat 25% OFF',
        validity: 'Valid till 30 Sep',
        imageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=600&q=80',
        badgeText: 'Trending'
    },
    {
        id: '2',
        category: 'villas',
        title: 'Private Pool Villa Bonanza',
        description: 'Book premium private pool villas in Munnar and enjoy free breakfast for 2.',
        code: 'VILLASTAY',
        discount: 'Save up to ₹3,000',
        validity: 'Valid till 15 Oct',
        imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80',
        badgeText: 'Popular'
    },
    {
        id: '3',
        category: 'bank',
        title: 'HDFC & ICICI Card Special',
        description: 'Instant 15% discount on credit and debit cards on bookings above ₹4,999.',
        code: 'BANKOREEDU',
        discount: 'Instant 15% OFF',
        validity: 'Valid till 31 Dec',
        imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=80',
        badgeText: 'Bank Offer'
    },
    {
        id: '4',
        category: 'seasonal',
        title: 'Weekend Group Getaways',
        description: 'Special pricing and complimentary barbecue dinner for groups of 6+.',
        code: 'GROUPFUN',
        discount: 'Up to 30% OFF',
        validity: 'Limited Stays',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
        badgeText: 'Limited'
    }
];

export default function OffersSection() {
    const [selectedTab, setSelectedTab] = useState<string>('all');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const filteredOffers = selectedTab === 'all'
        ? OFFERS_DATA
        : OFFERS_DATA.filter(o => o.category === selectedTab);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    return (
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow ring-1 ring-black/[0.04]">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500 fill-current" />
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Offers & Deals</h2>
                    </div>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">Exclusive curated promotions for your next Kerala vacation</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-full overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: 'All Offers' },
                            { id: 'resorts', label: 'Resorts' },
                            { id: 'villas', label: 'Villas' },
                            { id: 'bank', label: 'Bank Deals' },
                            { id: 'seasonal', label: 'Seasonal' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedTab(tab.id)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    selectedTab === tab.id
                                        ? 'bg-primary-600 text-white shadow-2xs'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <Link
                        to="/offers"
                        className="hidden md:flex items-center gap-1 text-xs font-black text-primary-700 hover:text-primary-800 transition-colors uppercase tracking-wider whitespace-nowrap"
                    >
                        <span>VIEW ALL</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>

            {/* Offer Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
                {filteredOffers.map((offer) => (
                    <div
                        key={offer.id}
                        className="group bg-gray-50/70 hover:bg-white rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-2xs hover:shadow-lg ring-1 ring-black/[0.04]"
                    >
                        <div>
                            {/* Image with Tag */}
                            <div className="relative h-36 overflow-hidden">
                                <img
                                    src={offer.imageUrl}
                                    alt={offer.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                {offer.badgeText && (
                                    <span className="absolute top-2.5 left-2.5 bg-primary-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                                        {offer.badgeText}
                                    </span>
                                )}
                                <span className="absolute bottom-2.5 left-2.5 text-white font-black text-sm tracking-tight drop-shadow-sm">
                                    {offer.discount}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-1">
                                    {offer.title}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                    {offer.description}
                                </p>
                            </div>
                        </div>

                        {/* Footer with Code & Action */}
                        <div className="p-4 pt-0">
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-medium">{offer.validity}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(offer.code)}
                                        className="flex items-center gap-1 text-[11px] font-mono font-bold text-gray-700 hover:text-primary-600 mt-0.5 group/code cursor-pointer"
                                        title="Click to copy code"
                                    >
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-dashed border-gray-300">
                                            {offer.code}
                                        </span>
                                        {copiedCode === offer.code ? (
                                            <Check className="h-3 w-3 text-emerald-600" />
                                        ) : (
                                            <Copy className="h-3 w-3 text-gray-400 group-hover/code:text-primary-600" />
                                        )}
                                    </button>
                                </div>

                                <Link
                                    to="/properties"
                                    className="px-3.5 py-1.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-2xs hover:shadow-md transition-all"
                                >
                                    BOOK NOW
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-5 text-center md:hidden">
                <Link
                    to="/offers"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-primary-700 hover:text-primary-800 uppercase tracking-wider"
                >
                    <span>View All Offers</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </section>
    );
}
