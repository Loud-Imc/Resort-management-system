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

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          user ? (
            <DashboardLayout>
              <Home />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/referrals"
        element={
          user ? (
            <DashboardLayout>
              <Referrals />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/rewards"
        element={
          user ? (
            <DashboardLayout>
              <Rewards />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/bookings"
        element={
          user ? (
            <DashboardLayout>
              <Bookings />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/settings"
        element={
          user ? (
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/wallet"
        element={
          user ? (
            <DashboardLayout>
              <WalletPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/book"
        element={
          user ? (
            <DashboardLayout>
              <InlineBookingPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

export default App;
