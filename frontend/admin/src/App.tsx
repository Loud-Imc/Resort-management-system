import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { PropertyProvider } from './context/PropertyContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import Login from './pages/Login';



// Users (Staff)
import UsersList from './pages/Users/UsersList';
import CreateUser from './pages/Users/CreateUser';

// Roles
import RolesList from './pages/Roles/RolesList';
import ProcessRole from './pages/Roles/ProcessRole';



// Financials
import {
  SettlementsList,
  RedemptionsList,
  AdjustmentRequestsList,
  RefundRequestsList,
  ReconciliationPage
} from './pages/Financials';

// Reports
import Reports from './pages/Reports/Reports';

// Properties
import { PropertiesList, PropertyForm, PropertyRequestsList } from './pages/Properties';

// Channel Partners
import { CPList } from './pages/ChannelPartners';

// Marketing
import { MarketingDashboard, CouponsPage, NotificationCenter, BannersPage, HeroContentPage, PromotionsPage } from './pages/Marketing';

// Events
import EventsList from './pages/Events/EventsList';
import EventForm from './pages/Events/EventForm';
import CheckIn from './pages/Events/CheckIn';
import EventBookings from './pages/Events/EventBookings';


// Categories
import CategoryList from './pages/PropertyCategories/CategoryList';

// Notifications
import Notifications from './pages/Notifications';
import PlatformSettings from './pages/Settings/PlatformSettings';
import AccountSettings from './pages/Settings/AccountSettings';
import ScrollToTop from './components/ScrollToTop';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <SocketProvider>
            <PropertyProvider>
              <ThemeProvider>
                <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
                <Routes>
                  <Route path="/login" element={<Login />} />

                  <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<DashboardHome />} />



                    {/* User/Staff Management */}
                    <Route path="users" element={<UsersList />} />
                    <Route path="users/create" element={<CreateUser />} />
                    <Route path="users/edit/:id" element={<CreateUser />} />

                    {/* Roles Management */}
                    <Route path="roles" element={<RolesList />} />
                    <Route path="roles/create" element={<ProcessRole />} />
                    <Route path="roles/edit/:id" element={<ProcessRole />} />



                    {/* Financials & Reports */}
                    <Route path="financials/settlements" element={<SettlementsList />} />
                    <Route path="financials/redemptions" element={<RedemptionsList />} />
                    <Route path="financials/adjustments" element={<AdjustmentRequestsList />} />
                    <Route path="financials/refunds" element={<RefundRequestsList />} />
                    <Route path="financials/reconciliation" element={<ReconciliationPage />} />
                    <Route path="reports" element={<Reports />} />

                    {/* Property Management */}
                    <Route path="properties" element={<PropertiesList />} />
                    <Route path="properties/requests" element={<PropertyRequestsList />} />
                    <Route path="properties/new" element={<PropertyForm />} />
                    <Route path="properties/:id" element={<PropertyForm />} />
                    <Route path="properties/:id/edit" element={<PropertyForm />} />

                    <Route path="property-categories" element={<CategoryList />} />

                    {/* Channel Partners */}
                    <Route path="channel-partners" element={<CPList />} />

                    {/* Marketing Management */}
                    <Route path="marketing" element={<MarketingDashboard />} />
                    <Route path="marketing/coupons" element={<CouponsPage />} />
                    <Route path="marketing/banners" element={<BannersPage />} />
                    <Route path="marketing/hero-content" element={<HeroContentPage />} />
                    <Route path="marketing/notifications" element={<NotificationCenter />} />
                    <Route path="marketing/promotions" element={<PromotionsPage />} />

                    {/* Event Management */}
                    <Route path="events" element={<EventsList />} />
                    <Route path="events/create" element={<EventForm />} />
                    <Route path="events/edit/:id" element={<EventForm />} />
                    <Route path="events/check-in" element={<CheckIn />} />
                    <Route path="events/bookings" element={<EventBookings />} />

                    {/* Notifications */}
                    <Route path="notifications" element={<Notifications />} />

                    {/* System Settings */}
                    <Route path="platform-settings" element={<PlatformSettings />} />
                    <Route path="account-settings" element={<AccountSettings />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ThemeProvider>
            </PropertyProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
