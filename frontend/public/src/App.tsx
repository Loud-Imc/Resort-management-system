import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import Contact from './pages/Contact';

import About from './pages/About';
import Gallery from './pages/Gallery';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

// Marketplace Pages
import PropertiesPage from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import RoomDetail from './pages/RoomDetail';
import EventDetail from './pages/EventDetail';
import EventBookingFlow from './pages/EventBooking';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import PartnerDashboard from './pages/PartnerDashboard';

import { CurrencyProvider } from './context/CurrencyContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/book" element={<Checkout />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/partner/dashboard" element={<PartnerDashboard />} />
              <Route path="/rooms" element={<Navigate to="/search" replace />} />

              {/* Marketplace Routes */}
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/:slug" element={<PropertyDetail />} />
              <Route path="/properties/:slug/rooms/:roomTypeId" element={<RoomDetail />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/events/:id/book" element={<EventBookingFlow />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}

export default App;
