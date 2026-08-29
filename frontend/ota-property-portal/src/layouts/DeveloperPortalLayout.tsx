import { NavLink, Outlet, Link } from 'react-router-dom';
import { Terminal, BookOpen, Cpu, ShieldCheck, Zap, Key, Sun, Moon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function DeveloperPortalLayout() {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { label: 'Overview', path: '/developers', icon: Terminal, end: true },
    { label: 'API Reference', path: '/developers/docs', icon: BookOpen },
    { label: 'Sandbox (TEST-PROP-001)', path: '/developers/sandbox', icon: Cpu },
    { label: 'Webhooks & HMAC', path: '/developers/webhooks', icon: Zap },
    { label: 'Self-Certification', path: '/developers/certification', icon: ShieldCheck },
    { label: 'Production Access', path: '/developers/production', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white text-center flex items-center justify-center gap-2 shadow-sm">
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase">V1 REST API</span>
        <span>RouteGuide OTA Connectivity Platform is open for external PMS & Channel Manager integrations.</span>
        <Link to="/developers/sandbox" className="underline hover:text-emerald-100 flex items-center gap-1 ml-1">
          Explore Sandbox <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Platform Badge */}
          <Link to="/developers" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">RouteGuide</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  DEVELOPERS
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-1 font-medium">B2B Connectivity Platform</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {localStorage.getItem('developer_token') ? (
              <Link
                to="/developers/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all"
              >
                Developer Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/developers/login"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs transition-all"
                >
                  Developer Sign In
                </Link>

                <Link
                  to="/developers/register"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all"
                >
                  Get Sandbox Access
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-slate-200 dark:border-slate-800/60 no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800/80 mt-16 py-12 text-xs text-slate-600 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-base text-slate-900 dark:text-white">RouteGuide Connectivity Platform</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 max-w-md text-xs leading-relaxed">
              Standard B2B REST API boundary connecting Property Management Systems (PMS), Channel Managers, and Connectivity Providers directly to RouteGuide distribution.
            </p>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>V1 Production REST API Operational</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-3">Developer Quick Links</h4>
            <ul className="space-y-2 font-medium">
              <li><Link to="/developers/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">API Reference</Link></li>
              <li><Link to="/developers/sandbox" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Sandbox TEST-PROP-001</Link></li>
              <li><Link to="/developers/webhooks" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Webhooks & HMAC Verification</Link></li>
              <li><Link to="/developers/certification" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">6-Milestone Certification</Link></li>
              <li><Link to="/developers/production" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Production Security Gate</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-3">Support & Legal</h4>
            <ul className="space-y-2 font-medium">
              <li className="text-slate-700 dark:text-slate-300 font-mono">connectivity-support@routeguide.com</li>
              <li><span className="text-slate-500 dark:text-slate-400">Vendor-Neutral B2B Standard</span></li>
              <li><span className="text-slate-500 dark:text-slate-400">HMAC-SHA256 Signed Outbox</span></li>
              <li><span className="text-slate-500 dark:text-slate-400">Isolated Sandbox Architecture</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>&copy; {new Date().getFullYear()} RouteGuide Inc. All rights reserved.</div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-medium">
            <span>Vendor-Neutral API</span>
            <span>&bull;</span>
            <span>Self-Service Certification</span>
            <span>&bull;</span>
            <span>Strict Production Isolation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
