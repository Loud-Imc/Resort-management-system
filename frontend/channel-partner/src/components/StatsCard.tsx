import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    isPositive?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, trend, isPositive }) => {
    return (
        <div className="glass-pane glass-pane-hover" style={{ padding: '1.5rem', flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500 }}>{title}</p>
                <div style={{
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(8, 71, 78, 0.05)',
                    color: 'var(--primary-teal)',
                    border: '1px solid var(--border-teal)'
                }}>
                    <Icon size={20} />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.8rem' }}>
                <h3 className="text-premium-gradient" style={{ fontSize: '1.8rem', fontWeight: 700 }}>{value}</h3>
                {trend && (
                    <span style={{
                        fontSize: '0.8rem',
                        color: isPositive ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                        marginBottom: '0.4rem'
                    }}>
                        {isPositive ? '+' : ''}{trend}
                    </span>
                )}
            </div>
        </div>
    );
};

export default StatsCard;
