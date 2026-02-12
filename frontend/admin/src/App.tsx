import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { PropertyProvider } from './context/PropertyContext';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import Login from './pages/Login';

// Bookings
import BookingsList from './pages/Bookings/BookingsList';
import CreateBooking from './pages/Bookings/CreateBooking';

// Rooms
import RoomsList from './pages/Rooms/RoomsList';
import CreateRoom from './pages/Rooms/CreateRoom';
import EditRoom from './pages/Rooms/EditRoom';

// Room Types
import RoomTypesList from './pages/RoomTypes/RoomTypesList';
import CreateRoomType from './pages/RoomTypes/CreateRoomType';

// Users (Staff)
import UsersList from './pages/Users/UsersList';
import CreateUser from './pages/Users/CreateUser';

// Roles
import RolesList from './pages/Roles/RolesList';
import ProcessRole from './pages/Roles/ProcessRole';

// Guests
import GuestsList from './pages/Guests/GuestsList';
import GuestDetails from './pages/Guests/GuestDetails';

// Payments
// Payments
import PaymentsList from './pages/Payments/PaymentsList';

// Booking Sources
import BookingSourcesList from './pages/BookingSources/BookingSourcesList';

// Financials
import Financials from './pages/Financials/Financials';

// Reports
import Reports from './pages/Reports/Reports';

// Properties
import { PropertiesList, PropertyForm } from './pages/Properties';
import StaffList from './pages/Properties/StaffList';

// Channel Partners
import { CPDashboard, CPList } from './pages/ChannelPartners';

// Marketing
import { MarketingDashboard, CouponsPage } from './pages/Marketing';

// Events
import EventsList from './pages/Events/EventsList';
import EventForm from './pages/Events/EventForm';
import CheckIn from './pages/Events/CheckIn';
import EventBookings from './pages/Events/EventBookings';



const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PropertyProvider>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />

                {/* Main Booking Management */}
                <Route path="bookings" element={<BookingsList />} />
                <Route path="bookings/create" element={<CreateBooking />} />
                <Route path="booking-sources" element={<BookingSourcesList />} />

                {/* Room Management */}
                <Route path="rooms" element={<RoomsList />} />
                <Route path="rooms/create" element={<CreateRoom />} />
                <Route path="rooms/edit/:id" element={<EditRoom />} />

                {/* Room Type Management */}
                <Route path="room-types" element={<RoomTypesList />} />
                <Route path="room-types/create" element={<CreateRoomType />} />
                <Route path="room-types/edit/:id" element={<CreateRoomType />} />

                {/* User/Staff Management */}
                <Route path="users" element={<UsersList />} />
                <Route path="users/create" element={<CreateUser />} />
                <Route path="users/edit/:id" element={<CreateUser />} />

                {/* Roles Management */}
                <Route path="roles" element={<RolesList />} />
                <Route path="roles/create" element={<ProcessRole />} />
                <Route path="roles/edit/:id" element={<ProcessRole />} />

                {/* Guest Management */}
                <Route path="guests" element={<GuestsList />} />
                <Route path="guests/:id" element={<GuestDetails />} />

                {/* Financials & Reports */}
                <Route path="financials" element={<Financials />} />
                <Route path="payments" element={<PaymentsList />} />
                <Route path="reports" element={<Reports />} />

                {/* Property Management */}
                <Route path="properties" element={<PropertiesList />} />
                <Route path="properties/new" element={<PropertyForm />} />
                <Route path="properties/:id" element={<PropertyForm />} />
                <Route path="properties/:id/edit" element={<PropertyForm />} />
                <Route path="properties/:id/staff" element={<StaffList />} />

                {/* Channel Partner */}
                <Route path="cp-dashboard" element={<CPDashboard />} />
                <Route path="channel-partners" element={<CPList />} />

                {/* Marketing Management */}
                <Route path="marketing" element={<MarketingDashboard />} />
                <Route path="marketing/coupons" element={<CouponsPage />} />

                {/* Event Management */}
                <Route path="events" element={<EventsList />} />
                <Route path="events/create" element={<EventForm />} />
                <Route path="events/edit/:id" element={<EventForm />} />
                <Route path="events/check-in" element={<CheckIn />} />
                <Route path="events/bookings" element={<EventBookings />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PropertyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
