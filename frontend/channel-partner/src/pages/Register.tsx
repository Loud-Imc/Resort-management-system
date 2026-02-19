import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { UserPlus } from 'lucide-react';

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        partnerType: 'INDIVIDUAL',
        organizationName: '',
        authorizedPersonName: '',
        businessAddress: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Endpoint created earlier in backend enhancements
            await api.post('/channel-partners/public-register', formData);
            alert('Application submitted successfully! We will review your profile and get back to you.');
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, var(--accent-indigo-glow) 0%, transparent 40%), radial-gradient(circle at bottom left, var(--primary-gold-glow) 0%, transparent 40%), var(--bg-dark)',
            padding: '4rem 2rem'
        }}>
            <div className="glass-pane animate-fade-in" style={{
                width: '100%',
                maxWidth: '600px',
                padding: '3rem',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '2.5rem' }}>
                    <h2 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Partner Application</h2>
                    <p style={{ color: 'var(--text-dim)' }}>Join our network and start earning commissions.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', textAlign: 'left' }}>
                    {error && (
                        <div style={{
                            gridColumn: 'span 2',
                            padding: '0.8rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            fontSize: '0.9rem',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Partner Type</label>
                        <select
                            name="partnerType"
                            value={formData.partnerType}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                padding: '0.8rem 1rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-glass)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                            className="glass-pane-hover"
                        >
                            <option value="INDIVIDUAL">Individual</option>
                            <option value="ORGANIZATION">Organization / Travel Agency</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>First Name</label>
                        <input name="firstName" placeholder="John" onChange={handleChange} required style={inputStyle} className="glass-pane-hover" />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Last Name</label>
                        <input name="lastName" placeholder="Doe" onChange={handleChange} required style={inputStyle} className="glass-pane-hover" />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Email Address</label>
                        <input name="email" type="email" placeholder="john@example.com" onChange={handleChange} required style={inputStyle} className="glass-pane-hover" />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Phone Number</label>
                        <input name="phone" placeholder="+91 99999 99999" onChange={handleChange} required style={inputStyle} className="glass-pane-hover" />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Password</label>
                        <input name="password" type="password" placeholder="••••••••" onChange={handleChange} required style={inputStyle} className="glass-pane-hover" />
                    </div>

                    {formData.partnerType === 'ORGANIZATION' && (
                        <>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Organization Name</label>
                                <input name="organizationName" placeholder="Elite Travel Agency" onChange={handleChange} style={inputStyle} className="glass-pane-hover" />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Business Address</label>
                                <input name="businessAddress" placeholder="123 Luxury Ave, Mumbai" onChange={handleChange} style={inputStyle} className="glass-pane-hover" />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            gridColumn: 'span 2',
                            padding: '1rem',
                            background: 'linear-gradient(135deg, var(--primary-gold) 0%, #ecd06f 100%)',
                            color: 'var(--bg-dark)',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            marginTop: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 15px var(--primary-gold-glow)',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? 'Submitting Application...' : (
                            <>
                                <UserPlus size={20} />
                                Apply for Partnership
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                    Already have an account? {' '}
                    <button
                        onClick={() => navigate('/login')}
                        style={{ background: 'none', color: 'var(--primary-gold)', fontWeight: 600 }}
                    >
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.8rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-main)',
    outline: 'none'
};

export default Register;
