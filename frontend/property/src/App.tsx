import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { PropertyProvider } from './context/PropertyContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import Login from './pages/Login';


// Pages
import BookingsList from './pages/Bookings/BookingsList';
import CreateBooking from './pages/Bookings/CreateBooking';
import RoomsList from './pages/Rooms/RoomsList';
import CreateRoom from './pages/Rooms/CreateRoom';
import EditRoom from './pages/Rooms/EditRoom';
import RoomTypesList from './pages/RoomTypes/RoomTypesList';
import CreateRoomType from './pages/RoomTypes/CreateRoomType';
import GuestsList from './pages/Guests/GuestsList';
import GuestDetails from './pages/Guests/GuestDetails';
import PaymentsList from './pages/Payments/PaymentsList';
import BookingSourcesList from './pages/BookingSources/BookingSourcesList';
import Financials from './pages/Financials/Financials';
import StaffList from './pages/Staff/StaffList';
import RolesList from './pages/Roles/RolesList';
import ProcessRole from './pages/Roles/ProcessRole';
import Reports from './pages/Reports/Reports';
import MyProperty from './pages/Property/MyProperty';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PropertyProvider>
            <ThemeProvider>
              <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />

                  {/* Bookings */}
                  <Route path="bookings" element={<BookingsList />} />
                  <Route path="bookings/create" element={<CreateBooking />} />

                  {/* Guests */}
                  <Route path="guests" element={<GuestsList />} />
                  <Route path="guests/:id" element={<GuestDetails />} />

                  {/* Rooms */}
                  <Route path="rooms" element={<RoomsList />} />
                  <Route path="rooms/create" element={<CreateRoom />} />
                  <Route path="rooms/edit/:id" element={<EditRoom />} />

                  {/* Room Types */}
                  <Route path="room-types" element={<RoomTypesList />} />
                  <Route path="room-types/create" element={<CreateRoomType />} />
                  <Route path="room-types/edit/:id" element={<CreateRoomType />} />

                  {/* Financials */}
                  <Route path="payments" element={<PaymentsList />} />
                  <Route path="financials" element={<Financials />} />
                  <Route path="booking-sources" element={<BookingSourcesList />} />

                  {/* Team & Roles */}
                  <Route path="team" element={<StaffList />} />
                  <Route path="roles" element={<RolesList />} />
                  <Route path="roles/create" element={<ProcessRole />} />
                  <Route path="roles/edit/:id" element={<ProcessRole />} />

                  {/* Reports */}
                  <Route path="reports" element={<Reports />} />

                  {/* My Property */}
                  <Route path="my-property" element={<MyProperty />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ThemeProvider>
          </PropertyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
