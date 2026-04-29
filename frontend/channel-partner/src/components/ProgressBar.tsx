import React from 'react';

interface ProgressBarProps {
    label: string;
    current: number;
    target: number;
    unit?: string;
    variant?: 'default' | 'compact';
    colorScheme?: 'default' | 'gold';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, current, target, unit = 'pts', variant = 'default', colorScheme = 'default' }) => {
    const percentage = Math.min((current / target) * 100, 100);

    const colors = {
        default: {
            bar: 'linear-gradient(90deg, var(--primary-teal) 0%, #0c6a75 100%)',
            track: 'rgba(var(--primary-teal-rgb, 8, 71, 78), 0.1)',
            glow: 'rgba(8, 71, 78, 0.1)'
        },
        gold: {
            bar: 'linear-gradient(90deg, #B8860B 0%, #FFD700 50%, #B8860B 100%)',
            track: 'rgba(184, 134, 11, 0.1)',
            glow: 'rgba(184, 134, 11, 0.2)'
        }
    }[colorScheme];

    if (variant === 'compact') {
        return (
            <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-main)', opacity: 0.8 }}>{label}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                        {current} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>/ {target} {unit}</span>
                    </span>
                </div>
                <div style={{
                    height: '4px',
                    background: colors.track,
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: colors.bar,
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                </div>
            </div>
        );
    }

    return (
        <div className="glass-pane" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    {current} <span style={{ color: colorScheme === 'gold' ? '#B8860B' : 'var(--primary-teal)' }}>/ {target} {unit}</span>
                </span>
            </div>

            <div style={{
                height: '8px',
                background: colors.track,
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: colors.bar,
                    borderRadius: 'var(--radius-full)',
                    boxShadow: `0 0 10px ${colors.glow}`,
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
            </div>

            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Only <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{target - current} more {unit}</span> to reach the next tier!
            </p>
        </div>
    );
};

export default ProgressBar;
