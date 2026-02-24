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
                <label className="block text-sm font-bold text-muted-foreground mb-1">
                    {label} {required && '*'}
                </label>
            )}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all cursor-pointer flex items-center justify-between ${isOpen ? 'ring-2 ring-primary border-primary' : ''
                    }`}
            >
                <span className={!selectedOption ? 'text-muted-foreground' : ''}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-2 border-b border-border bg-muted/30">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1 py-2 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.id}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`px-4 py-2 rounded-lg cursor-pointer flex items-center justify-between group transition-colors ${value === opt.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted text-card-foreground'
                                        }`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">{opt.label}</span>
                                        {opt.subLabel && (
                                            <span className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
                                                {opt.subLabel}
                                            </span>
                                        )}
                                    </div>
                                    {value === opt.id && <Check className="h-4 w-4 text-primary" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-muted-foreground text-sm italic">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
