import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

interface CollectionItem {
    id: string;
    title: string;
    tag: string;
    subtitle: string;
    imageUrl: string;
    searchQuery: string;
}

const COLLECTIONS: CollectionItem[] = [
    {
        id: '1',
        tag: 'VILLAS',
        title: 'Private Pool Villas',
        subtitle: 'Secluded retreats with private plunge pools',
        imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80',
        searchQuery: 'location=Wayanad'
    },
    {
        id: '2',
        tag: 'ECO STAYS',
        title: 'Forest Treehouses & Domes',
        subtitle: 'Immerse in wildlife and rainforest canopy',
        imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
        searchQuery: 'location=Wayanad'
    },
    {
        id: '3',
        tag: 'HILL RETREATS',
        title: 'Misty Mountain Cottages',
        subtitle: 'Chilly morning fog and panoramic tea valleys',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        searchQuery: 'location=Munnar'
    },
    {
        id: '4',
        tag: 'HERITAGE',
        title: 'Malabar Heritage Stays',
        subtitle: 'Centuries-old wooden manors & tharavads',
        imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
        searchQuery: 'location=Kozhikode'
    }
];

export default function HandpickedCollections() {
    return (
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow ring-1 ring-black/[0.04]">
            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-gray-100">
                <div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary-600 fill-current" />
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Handpicked Collections for You</h2>
                    </div>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">Curated getaway themes tailored for distinct travel styles</p>
                </div>

                <Link
                    to="/properties"
                    className="hidden sm:flex items-center gap-1.5 text-xs font-black text-primary-700 hover:text-primary-800 uppercase tracking-wider"
                >
                    <span>EXPLORE ALL</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
                {COLLECTIONS.map((item) => (
                    <Link
                        key={item.id}
                        to={`/search?${item.searchQuery}`}
                        className="group relative h-72 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 block"
                    >
                        <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5 flex flex-col justify-between">
                            <div>
                                <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/20">
                                    {item.tag}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white leading-tight group-hover:text-primary-200 transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-xs text-white/80 mt-1 line-clamp-2">
                                    {item.subtitle}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
