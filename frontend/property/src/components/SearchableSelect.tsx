import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface Option {
    id: string;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    required = false,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.id === value);

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.subLabel?.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label} {required && '*'}
                </label>
            )}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer flex items-center justify-between ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''
                    }`}
            >
                <span className={clsx(
                    'truncate',
                    !selectedOption ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
                )}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                onClick={(e) => e.stopPropagation()}
                            />
                            {search && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearch('');
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1 py-1 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.id}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`px-3 py-2 rounded-md cursor-pointer flex items-center justify-between group transition-colors ${value === opt.id
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                                        }`}
                                >
                                    <div className="flex flex-col truncate">
                                        <span className="font-semibold text-sm truncate">{opt.label}</span>
                                        {opt.subLabel && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {opt.subLabel}
                                            </span>
                                        )}
                                    </div>
                                    {value === opt.id && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm italic">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper to keep clsx dependency clean
function clsx(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
