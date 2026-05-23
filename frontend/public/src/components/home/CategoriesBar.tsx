import { useQuery } from '@tanstack/react-query';
import { useSearch } from '../../context/SearchContext';
import { propertyApi } from '../../services/properties';
import { 
    LayoutGrid, 
    Users, 
    Palmtree, 
    Hotel, 
    Home, 
    Coffee, 
    Layout, 
    Tent, 
    Building, 
    Globe, 
    Leaf, 
    Waves 
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
    Palmtree, Hotel, Home, Coffee, Tent, Building, Globe, Layout, Leaf, Waves,
};

const getIcon = (iconName?: string) => {
    const Icon = iconName ? ICON_MAP[iconName] : Building;
    return Icon || Building;
};

export default function CategoriesBar() {
    const {
        categoryId,
        setCategoryId,
        isGroupBooking,
        setIsGroupBooking,
    } = useSearch();

    const { data: categories = [] } = useQuery({
        queryKey: ['property-categories'],
        queryFn: () => propertyApi.getCategories(),
    });

    const handleCategoryClick = (catId: string, isGroup: boolean) => {
        setCategoryId(catId);
        setIsGroupBooking(isGroup);
    };

    return (
        <div className="mb-3">
            <div className="flex items-center gap-4 w-full overflow-x-auto no-scrollbar pb-4">
                {/* All Stays */}
                <button
                    onClick={() => handleCategoryClick('', false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border transition-all duration-300 whitespace-nowrap ${
                        !isGroupBooking && !categoryId
                            ? 'bg-primary-800 text-white border-primary-800 shadow-md'
                            : 'bg-white text-gray-700 border-primary-800 hover:bg-primary-800/5'
                    }`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-sm font-semibold">All Stays</span>
                </button>

                {/* Group Booking */}
                <button
                    onClick={() => handleCategoryClick('', true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border transition-all duration-300 whitespace-nowrap ${
                        isGroupBooking
                            ? 'bg-primary-800 text-white border-primary-800 shadow-md'
                            : 'bg-white text-gray-700 border-primary-800 hover:bg-primary-800/5'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-semibold">Group Booking</span>
                </button>

                {/* Dynamic Categories */}
                {categories.map((cat) => {
                    const Icon = getIcon(cat.icon);
                    const isActive = !isGroupBooking && categoryId === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id, false)}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border transition-all duration-300 whitespace-nowrap ${
                                isActive
                                    ? 'bg-primary-800 text-white border-primary-800 shadow-md'
                                    : 'bg-white text-gray-700 border-primary-800 hover:bg-primary-800/5'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-semibold">{cat.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
