import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './layout/DashboardLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Referrals from './pages/Referrals';
import Rewards from './pages/Rewards';
import Bookings from './pages/Bookings';
import Settings from './pages/Settings';
import WalletPage from './pages/WalletPage';
import InlineBookingPage from './pages/InlineBookingPage';
import Notifications from './pages/Notifications';
import DeleteAccount from './pages/DeleteAccount';
import './App.css';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)',
        color: 'var(--primary-gold)'
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 600 }} className="text-premium-gradient">Loading...</div>
      </div>
    );
  }

  // Portal guard — only ChannelPartner or SuperAdmin may access CP portal
  const CP_ALLOWED = ['ChannelPartner', 'SuperAdmin'];
  const userRoles: string[] = (user as any)?.roles || ((user as any)?.role ? [(user as any).role] : []);
  const hasCpAccess = userRoles.some(r => CP_ALLOWED.includes(r));

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user) return <Navigate to="/login" />;
    if (!hasCpAccess) return <Navigate to="/login" />;
    return <DashboardLayout>{children}</DashboardLayout>;
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/delete-account" element={<DeleteAccount />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
      <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
      <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
      <Route path="/book" element={<ProtectedRoute><InlineBookingPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
