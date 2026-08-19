import { useState, useEffect } from 'react';
import { otaService } from '../services/otaService';
import {
  TrendingUp,
  BookOpen,
  DollarSign,
  AlertCircle,
  CheckCircle,
  MapPin,
  FileText,
  Home,
  Image as ImageIcon,
  Sliders,
  Loader2,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useOutletContext } from 'react-router-dom';

export default function OtaDashboardHome() {
  const { handleActivatePms } = useOutletContext<{ handleActivatePms: () => void }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await otaService.getDashboard();
      setData(res);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };



  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.hasProperty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto text-center py-10">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4 animate-bounce" />
        <h2 className="text-2xl font-black text-foreground">No Listing Found</h2>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          Your account is registered but does not have a listing associated. Please log in to the legacy registration system or contact RouteGuide support to assign your hotel.
        </p>
      </div>
    );
  }

  const { setupStatus, stats, recentBookings } = data;

  const checklistItems = [
    {
      key: 'hasCoordinates',
      label: 'Geographical Coordinates',
      desc: 'Set latitude & longitude mapping links for maps.',
      status: setupStatus.hasCoordinates,
      icon: MapPin,
    },
    {
      key: 'hasRoomTypes',
      label: 'Room Types & Rates',
      desc: 'Configure at least one Room Type category with pricing.',
      status: setupStatus.hasRoomTypes,
      icon: Sliders,
    },
    {
      key: 'hasRooms',
      label: 'Physical Inventory Allocations',
      desc: 'Add room number identifiers (e.g. 101, 102) for availability checks.',
      status: setupStatus.hasRooms,
      icon: Home,
    },
    {
      key: 'hasImages',
      label: 'Cover Image & Photos',
      desc: 'Upload a cover image card and listing photo gallery.',
      status: setupStatus.hasImages,
      icon: ImageIcon,
    },
    {
      key: 'hasPolicies',
      label: 'Cancellation Policies',
      desc: 'Formulate cancellation parameters (e.g. Free Cancellation, No Refund).',
      status: setupStatus.hasPolicies,
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Top Banner Callout */}
      <div className="p-6 bg-gradient-to-r from-primary/90 to-primary/75 text-primary-foreground border border-primary/20 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 z-10">
          <span className="bg-white/20 text-white border border-white/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1.5">
            Legacy Upgrade
          </span>
          <h2 className="text-xl font-black text-white">Unlock Front-Desk Powers!</h2>
          <p className="text-white/90 text-xs max-w-xl font-medium">
            Want to handle in-person checkins, staff roles, housekeeping status, and expense reporting? Activate RouteGuide PMS instantly.
          </p>
        </div>
        <button
          onClick={handleActivatePms}
          className="z-10 py-2.5 px-5 bg-white hover:bg-slate-50 text-primary font-extrabold text-xs rounded-xl shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
        >
          Activate RouteGuide PMS
        </button>
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-card border border-border rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Listing Views</span>
            <span className="text-xl font-black text-foreground block mt-0.5">8,421</span>
            <span className="text-[9px] text-emerald-500 font-bold block mt-0.5">↑ 12% vs last month</span>
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Bookings</span>
            <span className="text-xl font-black text-foreground block mt-0.5">{stats.totalBookings}</span>
            <span className="text-[9px] text-primary font-bold block mt-0.5">{stats.activeOccupancy} Active stays</span>
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Revenue</span>
            <span className="text-xl font-black text-foreground block mt-0.5">₹{stats.totalRevenue.toLocaleString()}</span>
            <span className="text-[9px] text-primary font-bold block mt-0.5">Confirmed OTA sales</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listing Setup Progress */}
        <div className="lg:col-span-1 p-6 bg-card border border-border rounded-3xl flex flex-col shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-primary" />
            <h3 className="font-extrabold text-base text-foreground">Listing Onboarding</h3>
          </div>
          <p className="text-muted-foreground text-xs mb-5 leading-relaxed">
            Complete the sections below to boost your listing quality ranking on RouteGuide search results.
          </p>

          <div className="space-y-4 flex-1">
            {checklistItems.map((item) => (
              <div key={item.key} className="flex gap-3 items-start">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  item.status 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className={`text-xs font-bold ${item.status ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.label}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{item.desc}</p>
                </div>
                {item.status ? (
                  <span className="text-[10px] text-emerald-500 font-black uppercase tracking-wider mt-1 shrink-0">Done</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider mt-1 shrink-0">Pending</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reservations */}
        <div className="lg:col-span-2 p-6 bg-card border border-border rounded-3xl flex flex-col shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-extrabold text-base text-foreground">Recent Guest Reservations</h3>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentBookings.length === 0 ? (
              <div className="h-full flex items-center justify-center flex-col py-10">
                <AlertCircle className="h-8 w-8 text-muted-foreground/45 mb-2" />
                <p className="text-xs text-muted-foreground font-bold">No reservations logged yet.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase tracking-widest text-[9px] font-bold">
                    <th className="pb-3">Guest</th>
                    <th className="pb-3">Dates</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3 text-right">Paid</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentBookings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-2">
                        <p className="font-bold text-foreground leading-tight">{b.guestName}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{b.guestPhone || b.guestEmail}</p>
                      </td>
                      <td className="py-3 pr-2">
                        <p className="font-medium text-foreground leading-tight">
                          {format(new Date(b.checkInDate), 'dd MMM')} - {format(new Date(b.checkOutDate), 'dd MMM')}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                          {b.bookingNumber}
                        </p>
                      </td>
                      <td className="py-3 pr-2 font-medium text-muted-foreground">{b.roomType?.name}</td>
                      <td className="py-3 pr-2 text-right font-black text-foreground">₹{Number(b.totalAmount).toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          b.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          b.status === 'CHECKED_IN' ? 'bg-primary/10 text-primary border border-primary/20' :
                          b.status === 'CHECKED_OUT' ? 'bg-muted text-muted-foreground border border-border' :
                          'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
