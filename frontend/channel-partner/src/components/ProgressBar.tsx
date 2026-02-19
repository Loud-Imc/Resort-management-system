import React from 'react';

interface ProgressBarProps {
    label: string;
    current: number;
    target: number;
    unit?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, current, target, unit = 'pts' }) => {
    const percentage = Math.min((current / target) * 100, 100);

    return (
        <div className="glass-pane" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    {current} <span style={{ color: 'var(--primary-teal)' }}>/ {target} {unit}</span>
                </span>

            </div>

            <div style={{
                height: '8px',
                background: 'var(--border-glass)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary-teal) 0%, #0c6a75 100%)',
                    borderRadius: 'var(--radius-full)',
                    boxShadow: '0 0 10px rgba(8, 71, 78, 0.1)',
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
