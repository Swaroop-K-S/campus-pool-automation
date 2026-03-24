import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, BarChart2, Settings, Bell, LogOut, GraduationCap, Menu, X, Grid3X3, ListChecks, QrCode } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../services/api';

export default function AdminLayout() {
  const location = useLocation();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeDrive, setActiveDrive] = useState<any>(null);

  // Check for any drive in event_day status
  useEffect(() => {
    api.get('/drives').then((d: any) => {
      if (d.success) {
        const eventDrive = (d.data || []).find((dr: any) => dr.status === 'event_day');
        setActiveDrive(eventDrive || null);
      }
    }).catch(() => {});
  }, [location.pathname]); // re-check when navigating

  const getPageTitle = () => {
    if (location.pathname.includes('/dashboard')) return 'Dashboard';
    if (location.pathname.includes('/room-assignment')) return 'Room Assignment';
    if (location.pathname.includes('/rounds')) return 'Round Management';
    if (location.pathname.includes('/drives/new')) return 'New Drive';
    if (location.pathname.includes('/drives/')) return 'Drive Detail';
    if (location.pathname.includes('/analytics')) return 'Analytics';
    if (location.pathname.includes('/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-60 bg-slate-900 h-screen fixed left-0 flex flex-col z-40 transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3 text-white">
          <GraduationCap className="w-7 h-7 text-indigo-500" />
          <span className="font-bold text-lg">CampusPool</span>
          <button className="ml-auto md:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
          {/* MAIN */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Main</div>
            <div className="space-y-1">
              {[
                { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
                { name: 'Analytics', icon: BarChart2, path: '/admin/analytics' },
              ].map(item => {
                const isActive = location.pathname === item.path || (item.name === 'Dashboard' && location.pathname.startsWith('/admin/drives'));
                return (
                  <Link key={item.name} to={item.path} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium
                      ${isActive ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <item.icon size={20} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* EVENT DAY — only visible when a drive is in event_day status */}
          {activeDrive && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Event Day</div>
              <div className="space-y-1">
                <Link to={`/admin/drives/${activeDrive._id}/room-assignment`} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium
                    ${location.pathname.includes('/room-assignment') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Grid3X3 size={20} /> Room Assignment
                </Link>
                <Link to={`/admin/drives/${activeDrive._id}/rounds`} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium
                    ${location.pathname.includes('/rounds') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <ListChecks size={20} /> Round Management
                </Link>
                <button onClick={() => window.open(`/event/${activeDrive._id}/qr-display`, '_blank')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-slate-400 hover:bg-slate-800 hover:text-white">
                  <QrCode size={20} /> QR Display ↗
                </button>
              </div>
            </div>
          )}

          {/* SYSTEM */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">System</div>
            <div className="space-y-1">
              <Link to="/admin/settings" onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium
                  ${location.pathname.includes('/settings') ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Settings size={20} /> Settings
              </Link>
            </div>
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
               {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
               <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name || 'Admin'}</p>
               <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email || 'admin@campuspool.in'}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 bg-slate-800/50 rounded-lg transition-colors border border-slate-700/50">
             <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="md:ml-60 flex-1 flex flex-col min-h-screen relative max-w-full">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 w-full">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-600 hover:text-indigo-600" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              {getPageTitle()}
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 relative">
               <Bell size={20} />
               <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
             <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors">
               {user?.name?.[0]?.toUpperCase() || 'A'}
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
