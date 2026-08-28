import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  Users,
  BedDouble,
  CalendarRange,
  Percent,
  Sparkles,
  Home,
  ChevronRight,
  ShieldCheck,
  Building,
  Sun,
  Moon,
  CreditCard,
  IndianRupee,
  Briefcase,
  Shield,
  PieChart,
  Package,
  RefreshCw,
  Lock,
  ChevronsUpDown,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { otaService } from '../services/otaService';
import logo from '../assets/logo.svg';

export default function OtaDashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isActivatingPms, setIsActivatingPms] = useState(false);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [propertyName, setPropertyName] = useState('Loading Resort...');
  const [setupPercent, setSetupPercent] = useState(0);

  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const data = await otaService.getMyProperties();
      setProperties(data || []);
      
      if (data && data.length > 0) {
        const storedId = localStorage.getItem('property_selectedPropertyId');
        const found = storedId ? data.find((p: any) => p.id === storedId) : null;
        if (found) {
          setSelectedProperty(found);
          setPropertyName(found.name);
        } else {
          setSelectedProperty(data[0]);
          setPropertyName(data[0].name);
        }
      }
    } catch (e) {
      console.error('Failed to load user properties portfolio', e);
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      fetchLayoutData();
    }
  }, [selectedProperty]);

  const fetchLayoutData = async () => {
    try {
      const res = await otaService.getDashboard();
      if (res.hasProperty) {
        setSetupPercent(res.setupStatus.percent);
      }
    } catch (e) {
      console.error('Failed to load layout properties info', e);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleActivatePms = () => {
    setIsActivationModalOpen(true);
  };

  const executePmsActivation = async () => {
    setIsActivatingPms(true);
    setIsActivationModalOpen(false);
    try {
      await otaService.activatePms();
      toast.success('RouteGuide PMS activated! Redirecting to full PMS panel...', { duration: 4000 });
      setTimeout(() => {
        window.location.href = import.meta.env.VITE_PMS_URL || 'http://localhost:5175';
      }, 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate PMS');
    } finally {
      setIsActivatingPms(false);
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Bookings', path: '/bookings', icon: CalendarDays },
    { label: 'Guests', path: '/guests', icon: Users },
    { label: 'Room Types', path: '/room-types', icon: BedDouble },
    { label: 'Rooms & Availability', path: '/rooms', icon: CalendarRange },
    { label: 'Offers & Marketing', path: '/offers', icon: Percent },
    { label: 'Promotional Boosters', path: '/boosters', icon: Sparkles },
    { label: 'My Property', path: '/my-property', icon: Home },
    { label: 'Developer Certification', path: '/developer-certification', icon: ShieldCheck },
  ];

  const disabledNavItems = [
    { label: 'Booking Revenue', icon: CreditCard },
    { label: 'Financials & Expenses', icon: IndianRupee },
    { label: 'Booking Sources', icon: Briefcase },
    { label: 'My Team', icon: Users },
    { label: 'Roles & Security', icon: Shield },
    { label: 'Business Reports', icon: PieChart },
    { label: 'Assets & Inventory', icon: Package },
    { label: 'OTA Channel Manager', icon: RefreshCw },
  ];

  const handleDisabledTabClick = (label: string) => {
    toast.error(`You have to activate the RouteGuide PMS to use ${label}. Click "Activate RouteGuide PMS" at the bottom of the sidebar to upgrade!`, {
      duration: 5000,
      icon: '🔒'
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans antialiased transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-68 bg-card border-r border-border fixed h-full z-20">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center justify-center mb-6 overflow-hidden">
            <img
              src={logo}
              alt="Route Guide"
              className={`h-11 w-auto object-contain ${theme !== "light" ? "brightness-0 invert" : ""}`}
            />
          </Link>

          {/* Scoped Property Header Card & Switcher (PMS-like layout) */}
          <div className="space-y-4">
            {properties.length > 0 && (
              <div className="relative">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1.5 block">
                  Active Property
                </label>
                <button
                  onClick={() => setIsPropertyModalOpen(true)}
                  className="w-full flex items-center justify-between p-2.5 text-sm border border-border rounded-xl hover:border-primary/50 transition-all text-left group bg-background/50 hover:bg-primary/5 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 w-full">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors leading-tight text-xs">
                        {selectedProperty?.name || propertyName}
                      </p>
                      {selectedProperty?.city && (
                        <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                          📍 {selectedProperty.city}
                        </p>
                      )}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground/60 shrink-0 ml-auto" />
                  </div>
                </button>
              </div>
            )}

            {/* Setup Progress */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold">Setup Progress</span>
                <span className="text-[10px] font-black text-primary">{setupPercent}%</span>
              </div>
              <div className="w-full bg-border h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500" 
                  style={{ width: `${setupPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0 group-hover:scale-105 transition-transform" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Premium PMS Disabled Tabs */}
          <div className="pt-2 border-t border-border/50 my-2 space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-4 mb-2">PMS Features</p>
            {disabledNavItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleDisabledTabClick(item.label)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground/45 hover:bg-muted/40 hover:text-muted-foreground/75 transition-all duration-200 group cursor-pointer relative"
              >
                <item.icon className="h-4 w-4 shrink-0 opacity-40 group-hover:scale-105 transition-transform" />
                <span className="truncate pr-4">{item.label}</span>
                <Lock className="h-3 w-3 ml-auto opacity-30 group-hover:opacity-50 shrink-0" />
              </button>
            ))}
          </div>
        </nav>

        {/* PMS Callout and Footer */}
        <div className="p-4 border-t border-border space-y-3 bg-muted/20">
          <button
            onClick={handleActivatePms}
            disabled={isActivatingPms}
            className="w-full py-2.5 px-3 bg-primary hover:opacity-90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 border border-primary/20 disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isActivatingPms ? 'Activating...' : 'Activate RouteGuide PMS'}</span>
            <ChevronRight className="h-3 w-3 ml-auto" />
          </button>

          {/* Theme Toggle inside OPP */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
          >
            {theme === 'light' ? (
              <Moon className="h-4.5 w-4.5 text-indigo-500" />
            ) : (
              <Sun className="h-4.5 w-4.5 text-yellow-500" />
            )}
            <span>{theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}</span>
          </button>

          {/* User profile */}
          <div className="flex items-center gap-3 p-2 bg-muted/40 rounded-xl">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {user?.firstName?.charAt(0) || 'O'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[9px] text-muted-foreground truncate mt-1 leading-none">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 hover:bg-red-500/10 text-red-500 hover:text-red-400 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-card border-b border-border z-30 flex items-center justify-between p-4 h-16 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm shrink-0">
            RG
          </div>
          <span className="font-extrabold text-sm tracking-tight text-foreground">OTA Portal</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleActivatePms}
            disabled={isActivatingPms}
            className="px-2.5 py-1.5 bg-primary text-primary-foreground font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Building className="h-3.5 w-3.5" />
            <span>PMS</span>
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-muted text-foreground rounded-xl"
          >
            {theme === 'light' ? <Moon className="h-4.5 w-4.5 text-indigo-500" /> : <Sun className="h-4.5 w-4.5 text-yellow-500" />}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-muted text-foreground rounded-xl"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative flex flex-col w-64 max-w-xs bg-card h-full border-r border-border p-5 z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <Link to="/" className="flex items-center overflow-hidden">
                <img
                  src={logo}
                  alt="Route Guide"
                  className={`h-9 w-auto object-contain ${theme !== "light" ? "brightness-0 invert" : ""}`}
                />
              </Link>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scoped Property Switcher for Mobile */}
            <div className="mb-4 shrink-0 space-y-3">
              {properties.length > 0 && (
                <div className="relative">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1.5 block">
                    Active Property
                  </label>
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setIsPropertyModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2 text-xs border border-border rounded-xl hover:border-primary/50 transition-all text-left bg-background/50 hover:bg-primary/5 cursor-pointer animate-in fade-in"
                  >
                    <div className="flex items-center gap-2 min-w-0 w-full">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate leading-tight">
                          {selectedProperty?.name || propertyName}
                        </p>
                        {selectedProperty?.city && (
                          <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                            📍 {selectedProperty.city}
                          </p>
                        )}
                      </div>
                      <ChevronsUpDown className="h-4 w-4 text-muted-foreground/60 shrink-0 ml-auto" />
                    </div>
                  </button>
                </div>
              )}

              {/* Progress */}
              <div className="p-2.5 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-semibold">Setup Progress</span>
                  <span className="text-[10px] font-black text-primary">{setupPercent}%</span>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}

              {/* Premium PMS Disabled Tabs on Mobile */}
              <div className="pt-2 border-t border-border/50 my-2 space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-4 mb-2">PMS Features</p>
                {disabledNavItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setIsSidebarOpen(false);
                      handleDisabledTabClick(item.label);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground/45 hover:bg-muted/40 hover:text-muted-foreground/75 transition-all duration-200 group cursor-pointer relative"
                  >
                    <item.icon className="h-4 w-4 shrink-0 opacity-40" />
                    <span className="truncate pr-4">{item.label}</span>
                    <Lock className="h-3 w-3 ml-auto opacity-30 shrink-0" />
                  </button>
                ))}
              </div>
            </nav>

            <div className="pt-4 border-t border-border space-y-3">
              <button
                onClick={handleLogout}
                className="w-full py-2 px-3 hover:bg-red-500/10 text-red-500 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-68 pt-16 md:pt-0 min-h-screen bg-background flex flex-col relative overflow-hidden transition-colors duration-300">
        <div className="p-6 md:p-8 flex-1 flex flex-col">
          <Outlet context={{ handleActivatePms }} />
        </div>
      </main>
      {/* Property Switcher Modal */}
      {isPropertyModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsPropertyModalOpen(false)}
        >
          <div 
            className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-xl overflow-hidden max-h-[80vh] flex flex-col animate-in scale-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex flex-col gap-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary p-2 rounded-xl">
                    <Building className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-foreground tracking-tight">Switch Managed Property</h2>
                    <p className="text-xs text-muted-foreground font-medium">Select or search through your allocated portfolio</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPropertyModalOpen(false)}
                  className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Filter Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter properties by name or city..."
                  className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground"
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  autoFocus
                />
                {propertySearch && (
                  <button 
                    onClick={() => setPropertySearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Properties List */}
            <div className="p-5 overflow-y-auto flex-1 bg-background/30 space-y-2">
              {properties
                .filter(p => {
                  const matchStr = `${p.name} ${p.city || ''} ${p.address || ''}`.toLowerCase();
                  return matchStr.includes(propertySearch.toLowerCase());
                })
                .map((p) => {
                  const isSelected = selectedProperty?.id === p.id;
                  const coverImg = p.coverImage || p.images?.[0];

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProperty(p);
                        localStorage.setItem('property_selectedPropertyId', p.id);
                        setIsPropertyModalOpen(false);
                        window.location.reload();
                      }}
                      className={`group flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected 
                          ? "bg-primary/5 border-primary shadow-sm" 
                          : "bg-card border-border hover:border-primary/40 hover:shadow-md"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 shrink-0 relative flex items-center justify-center">
                        {coverImg ? (
                          <img src={coverImg} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <Building className="h-5 w-5 text-primary/45" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-xs text-foreground truncate group-hover:text-primary transition-colors">{p.name}</h4>
                        {p.city && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">📍 {p.city}</p>
                        )}
                      </div>

                      {/* Selected dot */}
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
                      )}
                    </div>
                  );
                })}

              {properties.filter(p => `${p.name} ${p.city || ''} ${p.address || ''}`.toLowerCase().includes(propertySearch.toLowerCase())).length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold text-muted-foreground">No properties match your filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* RouteGuide PMS Activation Modal */}
      {isActivationModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsActivationModalOpen(false)}
        >
          <div 
            className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-md overflow-hidden animate-in scale-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-foreground tracking-tight text-left">Activate RouteGuide PMS</h2>
                  <p className="text-[10px] text-muted-foreground font-semibold text-left">
                    Upgrade to full-featured frontdesk property management
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsActivationModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-3 text-xs text-muted-foreground font-medium text-left leading-relaxed">
              <p>
                You are about to activate the **RouteGuide PMS** package. This premium upgrade will immediately enable:
              </p>
              <ul className="space-y-1.5 list-disc pl-4 text-foreground/80 font-bold">
                <li>Dynamic frontdesk calendar boards and room allocations.</li>
                <li>Detailed bookings revenue, channels commissions, and reporting.</li>
                <li>Roster plans, roles, and staff permissions configuration.</li>
                <li>Housekeeping checklists and room-clean registers.</li>
              </ul>
              <p className="pt-2 text-[11px] text-amber-500 font-bold">
                * Note: Your portal environment will be upgraded immediately. Direct manual walk-ins and phone bookings will carry over.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={() => setIsActivationModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executePmsActivation}
                disabled={isActivatingPms}
                className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all shadow-md shadow-primary/25 cursor-pointer flex items-center gap-1.5"
              >
                {isActivatingPms && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{isActivatingPms ? 'Activating...' : 'Confirm Activation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
