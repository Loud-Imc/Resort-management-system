import React, { useEffect, useState } from 'react';
import { User, Shield, CreditCard, Bell, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

type TabType = 'profile' | 'payout' | 'security' | 'notifications';

const Settings: React.FC = () => {
    const { } = useAuth(); // Profile data is fetched from the API hook below
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        bankName: '',
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
        notificationPrefs: {
            emailReferrals: true,
            emailRewards: true,
            pushBookings: true
        },
        referralCode: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const data: any = await api.get('/channel-partners/me');
                setFormData({
                    firstName: data.user.firstName || '',
                    lastName: data.user.lastName || '',
                    email: data.user.email || '',
                    phone: data.user.phone || '',
                    password: '',
                    confirmPassword: '',
                    bankName: data.bankName || '',
                    accountHolderName: data.accountHolderName || '',
                    accountNumber: data.accountNumber || '',
                    ifscCode: data.ifscCode || '',
                    upiId: data.upiId || '',
                    notificationPrefs: data.notificationPrefs || {
                        emailReferrals: true,
                        emailRewards: true,
                        pushBookings: true
                    },
                    referralCode: data.referralCode || ''
                });
            } catch (error) {
                console.error('Error fetching CP profile:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNotificationToggle = (key: keyof typeof formData.notificationPrefs) => {
        setFormData(prev => ({
            ...prev,
            notificationPrefs: {
                ...prev.notificationPrefs,
                [key]: !prev.notificationPrefs[key]
            }
        }));
    };

    const handleSave = async () => {
        if (activeTab === 'security' && formData.password) {
            if (formData.password !== formData.confirmPassword) {
                setMessage({ type: 'error', text: 'Passwords do not match' });
                return;
            }
            if (formData.password.length < 6) {
                setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
                return;
            }
        }

        setIsSaving(true);
        setMessage(null);
        try {
            const updateData: any = { ...formData };
            delete updateData.referralCode;
            delete updateData.confirmPassword;
            if (!updateData.password) delete updateData.password;

            await api.patch('/channel-partners/me', updateData);
            setMessage({ type: 'success', text: 'Settings updated successfully' });

            // Clear passwords after save
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update settings' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} className="animate-spin" color="var(--primary-gold)" />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Account Settings</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Manage your professional profile and configuration.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="glass-pane"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        padding: '0.8rem 1.5rem',
                        background: 'var(--primary-gold)',
                        color: 'black',
                        fontWeight: 700,
                        border: 'none',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        opacity: isSaving ? 0.7 : 1,
                        transition: 'all 0.3s ease'
                    }}
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {message && (
                <div style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: message.type === 'success' ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem'
                }}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
                <div className="glass-pane" style={{ padding: '1.5rem', alignSelf: 'start' }}>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <TabButton
                            active={activeTab === 'profile'}
                            onClick={() => setActiveTab('profile')}
                            icon={<User size={18} />}
                            label="Profile"
                        />
                        <TabButton
                            active={activeTab === 'payout'}
                            onClick={() => setActiveTab('payout')}
                            icon={<CreditCard size={18} />}
                            label="Payout Details"
                        />
                        <TabButton
                            active={activeTab === 'security'}
                            onClick={() => setActiveTab('security')}
                            icon={<Shield size={18} />}
                            label="Security"
                        />
                        <TabButton
                            active={activeTab === 'notifications'}
                            onClick={() => setActiveTab('notifications')}
                            icon={<Bell size={18} />}
                            label="Notifications"
                        />
                    </nav>
                </div>

                <div className="glass-pane" style={{ padding: '2.5rem' }}>
                    {activeTab === 'profile' && (
                        <div>
                            <h3 style={{ marginBottom: '2rem' }}>Personal Information</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={labelStyle}>First Name</label>
                                    <input name="firstName" value={formData.firstName} onChange={handleInputChange} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Last Name</label>
                                    <input name="lastName" value={formData.lastName} onChange={handleInputChange} style={inputStyle} />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Email Address</label>
                                    <input name="email" value={formData.email} onChange={handleInputChange} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Phone Number</label>
                                    <input name="phone" value={formData.phone} onChange={handleInputChange} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Partner Code</label>
                                    <input value={formData.referralCode} readOnly style={{ ...inputStyle, color: 'var(--primary-gold)', fontWeight: 700, opacity: 0.7 }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payout' && (
                        <div>
                            <h3 style={{ marginBottom: '2rem' }}>Payout & Bank Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Account Holder Name</label>
                                    <input name="accountHolderName" value={formData.accountHolderName} onChange={handleInputChange} style={inputStyle} placeholder="Full name as per bank records" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Bank Name</label>
                                    <input name="bankName" value={formData.bankName} onChange={handleInputChange} style={inputStyle} placeholder="e.g. HDFC Bank, SBI" />
                                </div>
                                <div>
                                    <label style={labelStyle}>IFSC / SWIFT Code</label>
                                    <input name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} style={inputStyle} placeholder="HDFC0001234" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Account Number</label>
                                    <input name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} style={inputStyle} placeholder="Your bank account number" />
                                </div>
                                <div>
                                    <label style={labelStyle}>UPI ID (Optional)</label>
                                    <input name="upiId" value={formData.upiId} onChange={handleInputChange} style={inputStyle} placeholder="username@bank" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div>
                            <h3 style={{ marginBottom: '2rem' }}>Change Password</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>New Password</label>
                                    <input name="password" type="password" value={formData.password} onChange={handleInputChange} style={inputStyle} placeholder="Minimum 6 characters" />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Confirm New Password</label>
                                    <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} style={inputStyle} placeholder="Re-type your new password" />
                                </div>
                            </div>
                            <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                Leave fields blank if you don't wish to change your password.
                            </p>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div>
                            <h3 style={{ marginBottom: '2rem' }}>Communication Preferences</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <NotificationToggle
                                    label="Email Alerts for New Referrals"
                                    description="Receive an email whenever a guest uses your code to book."
                                    active={formData.notificationPrefs.emailReferrals}
                                    onToggle={() => handleNotificationToggle('emailReferrals')}
                                />
                                <NotificationToggle
                                    label="Rewards & Points Updates"
                                    description="Get notified about points earned and reward redemptions."
                                    active={formData.notificationPrefs.emailRewards}
                                    onToggle={() => handleNotificationToggle('emailRewards')}
                                />
                                <NotificationToggle
                                    label="Push Notifications for Bookings"
                                    description="Stay updated with guest check-ins and check-outs in real-time."
                                    active={formData.notificationPrefs.pushBookings}
                                    onToggle={() => handleNotificationToggle('pushBookings')}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className="glass-pane-hover"
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.8rem 1rem',
            background: active ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
            color: active ? 'var(--primary-gold)' : 'var(--text-dim)',
            width: '100%',
            borderRadius: 'var(--radius-md)',
            border: active ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
        }}
    >
        {icon} <span style={{ fontWeight: 600 }}>{label}</span>
    </button>
);

const NotificationToggle: React.FC<{ label: string, description: string, active: boolean, onToggle: () => void }> = ({ label, description, active, onToggle }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{label}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{description}</p>
        </div>
        <div
            onClick={onToggle}
            style={{
                width: '44px',
                height: '24px',
                background: active ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.3s ease'
            }}
        >
            <div style={{
                width: '18px',
                height: '18px',
                background: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '3px',
                left: active ? '23px' : '3px',
                transition: 'left 0.3s ease'
            }} />
        </div>
    </div>
);

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.85rem',
    color: 'var(--text-dim)',
    marginBottom: '0.5rem'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.8rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-main)',
    outline: 'none',
    transition: 'border-color 0.3s ease'
};

export default Settings;
