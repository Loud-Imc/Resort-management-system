import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
    currentPage, totalPages, totalItems, itemsPerPage, onPageChange,
}) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPages = (): (number | '...')[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | '...')[] = [1];
        if (currentPage > 3) pages.push('...');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
        return pages;
    };

    const btnBase: React.CSSProperties = {
        width: '36px', height: '36px', borderRadius: '10px',
        border: '1px solid var(--border-glass)', background: 'transparent',
        color: 'var(--text-dim)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s', fontSize: '0.85rem', fontWeight: 600,
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 0 0', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-glass)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                Showing <strong style={{ color: 'var(--text-main)' }}>{startItem}–{endItem}</strong> of <strong style={{ color: 'var(--text-main)' }}>{totalItems}</strong>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
                    style={{ ...btnBase, opacity: currentPage === 1 ? 0.35 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
                    <ChevronLeft size={16} />
                </button>
                {getPages().map((page, idx) =>
                    page === '...' ? (
                        <span key={`e${idx}`} style={{ color: 'var(--text-dim)', padding: '0 0.2rem' }}>…</span>
                    ) : (
                        <button key={page} onClick={() => onPageChange(page as number)}
                            style={{
                                ...btnBase,
                                background: currentPage === page ? 'var(--primary-teal)' : 'transparent',
                                color: currentPage === page ? '#fff' : 'var(--text-dim)',
                                fontWeight: currentPage === page ? 800 : 600,
                                border: currentPage === page ? 'none' : '1px solid var(--border-glass)',
                            }}>
                            {page}
                        </button>
                    )
                )}
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
                    style={{ ...btnBase, opacity: currentPage === totalPages ? 0.35 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default PaginationControls;
