import { useQuery } from '@tanstack/react-query';
import { useSearch } from '../../context/SearchContext';
import { propertyApi } from '../../services/properties';
import { 
    LayoutGrid, 
    Palmtree, 
    Hotel, 
    Home, 
    Coffee, 
    Tent, 
    Building, 
    Globe, 
    Leaf, 
    Waves,
    Trees
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
    Palmtree, Hotel, Home, Coffee, Tent, Building, Globe, Leaf, Waves, Trees, LayoutGrid
};

const getIcon = (iconName?: string) => {
    const Icon = iconName ? ICON_MAP[iconName] : Building;
    return Icon || Building;
};

// Default Curated Hospitality Categories matching MMT layout
const DEFAULT_CATEGORIES = [
    { id: '', name: 'Resorts', icon: Hotel, isGroup: false },
    { id: 'villas', name: 'Villas & Homestays', icon: Home, isGroup: false },
    { id: 'cottages', name: 'Cottages', icon: Coffee, isGroup: false },
    { id: 'eco-stays', name: 'Eco-Stays', icon: Leaf, isGroup: false, isNew: true },
    { id: 'treehouses', name: 'Treehouses', icon: Trees, isGroup: false },
    { id: 'houseboats', name: 'Houseboats', icon: Waves, isGroup: false },
    { id: 'beachfront', name: 'Beachfront', icon: Palmtree, isGroup: false },
    { id: 'all', name: 'All Properties', icon: LayoutGrid, isGroup: false },
];

export default function CategoriesBar() {
    const {
        categoryId,
        setCategoryId,
        isGroupBooking,
        setIsGroupBooking,
    } = useSearch();

    const { data: dbCategories = [] } = useQuery({
        queryKey: ['property-categories'],
        queryFn: () => propertyApi.getCategories(),
    });

    const handleCategoryClick = (catId: string, isGroup: boolean) => {
        setCategoryId(catId);
        setIsGroupBooking(isGroup);
    };

    // If DB categories exist, map them or merge with defaults
    const displayCategories = dbCategories.length > 0 
        ? [
            { id: '', name: 'Resorts', icon: Hotel, isGroup: false },
            ...dbCategories.map(c => ({
                id: c.id,
                name: c.name,
                icon: getIcon(c.icon),
                isGroup: false,
                isNew: c.name.toLowerCase().includes('eco') || c.name.toLowerCase().includes('villa')
            })),
            { id: 'all-props', name: 'All Properties', icon: LayoutGrid, isGroup: false }
          ]
        : DEFAULT_CATEGORIES;

    return (
        <div className="w-full flex justify-center -mb-8 relative z-30 px-4">
            <div className="bg-white rounded-xl shadow-xl px-4 sm:px-8 py-2.5 flex items-center justify-between gap-1 sm:gap-4 overflow-x-auto no-scrollbar max-w-[1040px] w-full border border-gray-100">
                {displayCategories.map((cat, idx) => {
                    const Icon = cat.icon;
                    // Active check
                    const isActive = !isGroupBooking && (
                        (cat.id === '' && !categoryId) ||
                        (cat.id === categoryId) ||
                        (cat.id === 'all-props' && categoryId === 'all')
                    );

                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleCategoryClick(cat.id === 'all-props' ? '' : cat.id, false)}
                            className="flex flex-col items-center justify-center py-1.5 px-2.5 sm:px-4 relative cursor-pointer group min-w-[68px] sm:min-w-[76px] transition-all"
                        >
                            {/* "new" Badge matching MMT */}
                            {cat.isNew && (
                                <span className="absolute -top-1 right-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">
                                    new
                                </span>
                            )}

                            {/* Category Icon */}
                            <Icon 
                                className={`w-6 h-6 transition-colors ${
                                    isActive 
                                        ? 'text-primary-600' 
                                        : 'text-gray-500 group-hover:text-gray-800'
                                }`} 
                            />

                            {/* Category Label */}
                            <span 
                                className={`text-[11px] sm:text-xs mt-1 tracking-tight text-center whitespace-nowrap transition-colors ${
                                    isActive 
                                        ? 'text-primary-700 font-extrabold' 
                                        : 'text-gray-600 group-hover:text-gray-900 font-medium'
                                }`}
                            >
                                {cat.name}
                            </span>

                            {/* Active Underline Indicator matching MMT */}
                            {isActive && (
                                <span className="absolute -bottom-2.5 left-2 right-2 h-0.5 bg-primary-600 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
