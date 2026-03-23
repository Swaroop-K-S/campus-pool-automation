import { Outlet, Link, useLocation } from 'react-router-dom';
import { DoorOpen, Calendar, LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export default function InvigilatorLayout() {
  const location = useLocation();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);

  const navItems = [
    { name: 'My Room', icon: DoorOpen, path: '/invigilator/dashboard' },
    { name: 'Schedule', icon: Calendar, path: '/invigilator/schedule' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 bg-slate-900 h-screen fixed left-0 flex flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3 text-white">
          <Shield className="w-7 h-7 text-indigo-500" />
          <span className="font-bold text-lg">Invigilator</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link key={item.name} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium
                  ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'I'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Invigilator'}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 bg-slate-800/50 rounded-lg transition-colors border border-slate-700/50">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-800">Invigilator Portal</h1>
        </header>
        <main className="flex-1 bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
