import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Building2, Loader2, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Suggestion {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
    type?: 'property' | 'location';
    propertyId?: string;
    slug?: string;
    lat?: number | null;
    lng?: number | null;
}

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (description: string, item?: Suggestion) => void;
    placeholder?: string;
    inputStyle?: React.CSSProperties;
    wrapperStyle?: React.CSSProperties;
}

export default function LocationAutocomplete({ value, onChange, onSelect, placeholder = 'Search city, resort, or address...', inputStyle, wrapperStyle }: Props) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchSuggestions = useCallback(async (input: string) => {
        if (input.length < 2) { setSuggestions([]); setIsOpen(false); return; }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/properties/autocomplete?input=${encodeURIComponent(input)}`);
            const data: Suggestion[] = await res.json();
            setSuggestions(data);
            setIsOpen(data.length > 0);
            setActiveIndex(-1);
        } catch { setSuggestions([]); setIsOpen(false); }
        finally { setIsLoading(false); }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
    };

    const handleSelect = (s: Suggestion) => {
        onChange(s.mainText);
        onSelect?.(s.mainText, s);
        setSuggestions([]); setIsOpen(false); setActiveIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(p => Math.min(p + 1, suggestions.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(p => Math.max(p - 1, 0)); }
        else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); handleSelect(suggestions[activeIndex]); }
        else if (e.key === 'Escape') setIsOpen(false);
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={containerRef} style={{ position: 'relative', ...wrapperStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                {isLoading
                    ? <Loader2 size={16} style={{ flexShrink: 0, color: 'var(--primary-teal)', animation: 'spin 1s linear infinite' }} />
                    : <MapPin size={16} style={{ flexShrink: 0, color: 'var(--text-dim)' }} />
                }
                <input
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    autoComplete="off"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', ...inputStyle }}
                />
                {value && (
                    <button type="button" onClick={() => { onChange(''); setSuggestions([]); setIsOpen(false); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0, display: 'flex' }}>
                        <X size={14} />
                    </button>
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem', zIndex: 999,
                    background: 'var(--glass-bg, #ffffff)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-glass, #e2e8f0)',
                    borderRadius: 'var(--radius-md, 12px)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
                    maxHeight: '280px', overflowY: 'auto',
                }}>
                    {suggestions.map((s, i) => (
                        <button
                            key={s.placeId}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', textAlign: 'left',
                                padding: '0.85rem 1rem', cursor: 'pointer', border: 'none', background: i === activeIndex ? 'rgba(8,71,78,0.08)' : 'transparent',
                                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-glass, #e2e8f0)' : 'none',
                                transition: 'background 0.15s',
                            }}
                        >
                            {s.type === 'property' ? (
                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(8,71,78,0.1)', color: '#08474e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Building2 size={15} />
                                </div>
                            ) : (
                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MapPin size={15} />
                                </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #0f172a)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.mainText}</p>
                                    {s.type === 'property' && (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(8,71,78,0.1)', color: '#08474e', flexShrink: 0 }}>
                                            Resort
                                        </span>
                                    )}
                                </div>
                                {s.secondaryText && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.secondaryText}</p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
