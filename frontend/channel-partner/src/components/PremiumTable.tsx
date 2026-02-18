import React from 'react';

interface Column<T> {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    align?: 'left' | 'center' | 'right';
    width?: string;
}

interface PremiumTableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
}

function PremiumTable<T extends { id: string | number }>({ columns, data, isLoading }: PremiumTableProps<T>) {
    return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: '0 0.8rem',
                textAlign: 'left'
            }}>
                <thead>
                    <tr>
                        {columns.map((col, index) => (
                            <th key={index} style={{
                                padding: '1rem 1.5rem',
                                color: 'var(--text-dim)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                textAlign: col.align || 'left',
                                width: col.width
                            }}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={columns.length} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                                Loading data...
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                                No records found.
                            </td>
                        </tr>
                    ) : (
                        data.map((item) => (
                            <tr key={item.id} className="glass-pane glass-pane-hover" style={{
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                {columns.map((col, index) => (
                                    <td key={index} style={{
                                        padding: '1.2rem 1.5rem',
                                        fontSize: '0.95rem',
                                        textAlign: col.align || 'left',
                                        border: 'none',
                                        background: 'transparent'
                                    }}>
                                        {typeof col.accessor === 'function'
                                            ? col.accessor(item)
                                            : (item[col.accessor] as React.ReactNode)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default PremiumTable;
