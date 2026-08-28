import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';

// Routing guards
import GuestRoute from './components/auth/GuestRoute';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Layout & pages
import OtaDashboardLayout from './layouts/OtaDashboardLayout';
import DeveloperPortalLayout from './layouts/DeveloperPortalLayout';
import OtaDashboardHome from './pages/OtaDashboardHome';
import OtaBookings from './pages/OtaBookings';
import OtaGuests from './pages/OtaGuests';
import OtaRoomTypes from './pages/OtaRoomTypes';
import OtaRoomsAvailability from './pages/OtaRoomsAvailability';
import OtaOffers from './pages/OtaOffers';
import OtaPromotionalBoosters from './pages/OtaPromotionalBoosters';
import OtaMyProperty from './pages/OtaMyProperty';
import DeveloperPortalHome from './pages/DeveloperPortalHome';
import DeveloperDocs from './pages/DeveloperDocs';
import DeveloperSandboxDocs from './pages/DeveloperSandboxDocs';
import DeveloperWebhooksDocs from './pages/DeveloperWebhooksDocs';
import DeveloperProductionDocs from './pages/DeveloperProductionDocs';
import DeveloperCertification from './pages/DeveloperCertification';
import DeveloperRegister from './pages/DeveloperRegister';
import DeveloperLogin from './pages/DeveloperLogin';
import DeveloperDashboard from './pages/DeveloperDashboard';
import Login from './pages/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
            <Routes>
              {/* Public/Guest auth routes */}
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

              {/* Public & Authenticated External Developer Portal */}
              <Route path="/developers" element={<DeveloperPortalLayout />}>
                <Route index element={<DeveloperPortalHome />} />
                <Route path="docs" element={<DeveloperDocs />} />
                <Route path="sandbox" element={<DeveloperSandboxDocs />} />
                <Route path="webhooks" element={<DeveloperWebhooksDocs />} />
                <Route path="certification" element={<DeveloperCertification />} />
                <Route path="production" element={<DeveloperProductionDocs />} />
                <Route path="register" element={<DeveloperRegister />} />
                <Route path="login" element={<DeveloperLogin />} />
                <Route path="dashboard" element={<DeveloperDashboard />} />
              </Route>

              {/* Authenticated OTA dashboard routes */}
              <Route path="/" element={<ProtectedRoute><OtaDashboardLayout /></ProtectedRoute>}>
                <Route index element={<OtaDashboardHome />} />
                <Route path="bookings" element={<OtaBookings />} />
                <Route path="guests" element={<OtaGuests />} />
                <Route path="room-types" element={<OtaRoomTypes />} />
                <Route path="rooms" element={<OtaRoomsAvailability />} />
                <Route path="offers" element={<OtaOffers />} />
                <Route path="boosters" element={<OtaPromotionalBoosters />} />
                <Route path="my-property" element={<OtaMyProperty />} />
                <Route path="developer-certification" element={<DeveloperCertification />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
