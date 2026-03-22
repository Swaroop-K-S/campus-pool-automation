import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building, Settings, Bell, LogOut, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export default function PlatformLayout() {
  const location = useLocation();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);

  const getPageTitle = () => {
    if (location.pathname.includes('/dashboard')) return 'Platform Summary';
    if (location.pathname.includes('/colleges')) return 'Managed Colleges';
    if (location.pathname.includes('/settings')) return 'Settings';
    return 'Platform Dashboard';
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/platform/dashboard' },
    { name: 'Colleges', icon: Building, path: '/platform/colleges' },
    { name: 'Settings', icon: Settings, path: '/platform/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 bg-emerald-900 h-screen fixed left-0 flex flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-emerald-800 gap-3 text-white">
          <GraduationCap className="w-7 h-7 text-emerald-400" />
          <span className="font-bold text-lg">Platform Admin</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
             const isActive = location.pathname.startsWith(item.path);
             return (
               <Link 
                 key={item.name} 
                 to={item.path} 
                 className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-semibold
                   ${isActive ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20' : 'text-slate-300 hover:bg-emerald-800 hover:text-white'}`}
               >
                 <item.icon size={20} />
                 {item.name}
               </Link>
             )
          })}
        </nav>

        <div className="p-4 border-t border-emerald-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
               {user?.name?.[0]?.toUpperCase() || 'P'}
            </div>
            <div className="overflow-hidden">
               <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name || 'Platform Admin'}</p>
               <p className="text-xs text-emerald-300 truncate mt-0.5">{user?.email || 'admin@campuspool.com'}</p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-emerald-200 hover:text-white hover:bg-emerald-800 bg-emerald-800/50 rounded-lg transition-colors border border-emerald-700/50"
          >
             <LogOut size={18} />
             Sign Out
          </button>
        </div>
      </aside>

      <div className="ml-60 flex-1 flex flex-col min-h-screen relative max-w-full">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 w-full">
          <h1 className="text-xl font-bold text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-emerald-900 to-emerald-700">
            {getPageTitle()}
          </h1>
          <div className="flex items-center gap-4">
             <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 relative">
               <Bell size={20} />
             </button>
             <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors">
               {user?.name?.[0]?.toUpperCase() || 'P'}
             </div>
          </div>
        </header>

        <main className="flex-1 w-full bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
