import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';

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

// Channel Partners
import { CPDashboard, CPList } from './pages/ChannelPartners';

// Marketing
import { MarketingDashboard } from './pages/Marketing';



const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
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

              {/* Channel Partner */}
              <Route path="cp-dashboard" element={<CPDashboard />} />
              <Route path="channel-partners" element={<CPList />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
