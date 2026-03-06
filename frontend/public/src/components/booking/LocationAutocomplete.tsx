import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Suggestion {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
}

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (description: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    theme?: 'dark' | 'light';
}

export default function LocationAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder = 'Where are you going?',
    inputClassName = '',
    theme = 'dark',
}: Props) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark';

    const fetchSuggestions = useCallback(async (input: string) => {
        if (input.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/properties/autocomplete?input=${encodeURIComponent(input)}`);
            const data: Suggestion[] = await res.json();
            setSuggestions(data);
            setIsOpen(data.length > 0);
            setActiveIndex(-1);
        } catch {
            setSuggestions([]);
            setIsOpen(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
    };

    const handleSelect = (suggestion: Suggestion) => {
        onChange(suggestion.mainText);
        onSelect?.(suggestion.description);
        setSuggestions([]);
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(suggestions[activeIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="flex items-center gap-3 w-full">
                {isLoading
                    ? <Loader2 className={`h-6 w-6 shrink-0 animate-spin ${isDark ? 'text-white/40' : 'text-primary-500'}`} />
                    : <MapPin className={`h-6 w-6 shrink-0 ${isDark ? 'text-white/40' : 'text-gray-300'}`} />
                }
                <input
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className={inputClassName}
                    autoComplete="off"
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => { onChange(''); setSuggestions([]); setIsOpen(false); }}
                        className={`shrink-0 ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-300 hover:text-gray-500'} transition-colors`}
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-[200] rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 bg-white border-gray-100">
                    {suggestions.map((s, i) => (
                        <button
                            key={s.placeId}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${i === activeIndex
                                ? 'bg-primary-50'
                                : 'hover:bg-gray-50'
                                } ${i < suggestions.length - 1 ? 'border-b border-gray-50' : ''}`}
                        >
                            <MapPin className="h-4 w-4 shrink-0 text-primary-500" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate text-gray-900">{s.mainText}</p>
                                {s.secondaryText && (
                                    <p className="text-[11px] truncate text-gray-400">{s.secondaryText}</p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
