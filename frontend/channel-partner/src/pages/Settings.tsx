import React, { useEffect, useState } from 'react';
import { User, Shield, CreditCard, Bell, Save, Loader2, CheckCircle2, AlertCircle, ImagePlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useSearchParams } from 'react-router-dom';

type TabType = 'profile' | 'payout' | 'security' | 'notifications';

const Settings: React.FC = () => {
    const { } = useAuth(); // Profile data is fetched from the API hook below
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<TabType>('profile');

    useEffect(() => {
        const tab = searchParams.get('tab') as TabType;
        if (tab && ['profile', 'payout', 'security', 'notifications'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);
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
        referralCode: '',
        registrationFeePaid: false,
        logo: ''
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
                    referralCode: data.referralCode || '',
                    registrationFeePaid: data.registrationFeePaid || false,
                    logo: data.logo || ''
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

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Logo size should not exceed 2MB' });
            return;
        }

        setIsSaving(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file', file);
            const response: any = await api.post('/uploads', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, logo: response.url }));
            setMessage({ type: 'success', text: 'Logo uploaded temporarily. Remember to save changes.' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to upload logo' });
        } finally {
            setIsSaving(false);
        }
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
            delete updateData.registrationFeePaid;
            if (!updateData.password) delete updateData.password;

            await api.patch('/channel-partners/me', updateData);
            setMessage({ type: 'success', text: 'Settings updated successfully' });

            // Clear passwords after save
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Failed to update settings';
            setMessage({
                type: 'error',
                text: Array.isArray(errorMsg) ? errorMsg[0] : errorMsg
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} className="animate-spin" color="var(--primary-teal)" />
            </div>
        );
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-padding)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <h1 className="text-premium-gradient" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 700, lineHeight: 1.2 }}>Account Settings</h1>
                        {formData.registrationFeePaid && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.4rem 0.8rem',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
                                animation: 'pulse 2s infinite'
                            }}>
                                <CheckCircle2 size={14} strokeWidth={3} />
                                VERIFIED
                            </div>
                        )}
                    </div>
                    <p style={{ color: 'var(--text-dim)' }}>Manage your professional profile and configuration.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="glass-pane-hover"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        padding: '0.8rem 1.5rem',
                        background: 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)',
                        color: '#ffffff',
                        fontWeight: 700,
                        border: 'none',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        opacity: isSaving ? 0.7 : 1,
                        transition: 'all 0.3s ease',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 4px 10px rgba(8, 71, 78, 0.2)'
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

            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--section-padding)' }}>
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

                <div className="glass-pane" style={{ padding: 'var(--section-padding)' }}>
                    {activeTab === 'profile' && (
                        <div>
                            <h3 style={{ marginBottom: '2rem' }}>Personal Information</h3>
                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
                                    <input value={formData.referralCode} readOnly style={{ ...inputStyle, color: 'var(--primary-teal)', fontWeight: 700, opacity: 0.7 }} />
                                </div>

                            </div>
                            
                            <h3 style={{ marginTop: '2.5rem', marginBottom: '1.5rem' }}>Agency Logo</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                    Upload your agency or personal logo. This logo will be displayed on the Perform Invoices generated for your bookings, letting your clients know it is provided by you.
                                </p>
                                {formData.logo ? (
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <img src={formData.logo} alt="Agency Logo" style={{ width: '150px', height: '150px', objectFit: 'contain', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: '0.5rem', background: 'white' }} />
                                        <button 
                                            onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                                            style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <label style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        width: '150px', 
                                        height: '150px', 
                                        border: '2px dashed var(--primary-teal)', 
                                        borderRadius: 'var(--radius-md)', 
                                        cursor: 'pointer',
                                        background: 'rgba(34, 124, 138, 0.05)',
                                        color: 'var(--primary-teal)',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <ImagePlus size={32} style={{ marginBottom: '0.5rem' }} />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Upload Logo</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>(Max 2MB)</span>
                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'payout' && (
                        <div>
                            <h3 style={{ marginBottom: '2rem' }}>Payout & Bank Details</h3>
                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
            background: active ? 'rgba(8, 71, 78, 0.05)' : 'transparent',
            color: active ? 'var(--primary-teal)' : '#64748b',
            width: '100%',
            borderRadius: 'var(--radius-md)',
            border: active ? '1px solid var(--border-teal)' : '1px solid transparent',

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
                background: active ? 'var(--primary-teal)' : '#e2e8f0',

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
    background: '#ffffff',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-main)',
    outline: 'none',
    transition: 'border-color 0.3s ease'

};

export default Settings;
