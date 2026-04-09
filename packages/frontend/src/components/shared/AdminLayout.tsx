import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Settings, LogOut, GraduationCap, Menu, X, Plus, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';
import { api } from '../../services/api';
import { CommandPalette } from './CommandPalette';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const { contextDriveId, setContextDriveId } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recentDrives, setRecentDrives] = useState<any[]>([]);

  // Auto-collapse sidebar when viewing a drive detail page
  const isDriveDetailPage = /^\/admin\/drives\/[a-f0-9]+$/i.test(location.pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isDriveDetailPage);

  useEffect(() => {
    setSidebarCollapsed(isDriveDetailPage);
  }, [location.pathname]);

  // Connect sidebar to backend to fetch live drive status and history
  useEffect(() => {
    api.get('/drives').then((d: any) => {
      if (d.success) {
        const allDrives = d.data || [];
        
        let selectedId = contextDriveId;
        if (!selectedId && allDrives.length > 0) {
           const eventDrive = allDrives.find((dr: any) => dr.status === 'event_day');
           selectedId = eventDrive?._id || allDrives[0]?._id;
           setContextDriveId(selectedId);
        }
        
        // Keep recent drives for the selector and quick links
        const sorted = [...allDrives].sort((a:any, b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentDrives(sorted.slice(0, 10));
      }
    }).catch(() => {});
  }, [location.pathname, contextDriveId, setContextDriveId]); // re-fetch to keep sidebar updated across navigations



  return (
    <div className="min-h-screen bg-slate-50 flex">
      <CommandPalette />
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Premium Dark Mode */}
      <aside 
        className={`bg-[#0B1120] border-r border-slate-800/80 h-screen fixed left-0 flex flex-col z-40 transition-all duration-300 ease-out shadow-2xl shadow-indigo-900/10 whitespace-nowrap overflow-hidden
        ${sidebarOpen ? 'translate-x-0 w-64' : sidebarCollapsed ? 'w-20 -translate-x-full md:translate-x-0' : 'w-64 -translate-x-full md:translate-x-0'}`}
        onMouseEnter={() => { if(isDriveDetailPage) setSidebarCollapsed(false); }}
        onMouseLeave={() => { if(isDriveDetailPage) setSidebarCollapsed(true); }}
      >
        {/* Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />

        {/* Logo */}
        <div className={`h-16 flex items-center px-6 border-b border-slate-800/50 gap-3 text-white relative z-10 ${sidebarCollapsed && !sidebarOpen ? 'justify-center px-0' : ''}`}>
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-xl shadow-lg shadow-indigo-500/20 shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className={`font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-200 transition-opacity duration-200 ${sidebarCollapsed && !sidebarOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>CampusPool</span>
          <button className="ml-auto md:hidden text-slate-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto relative z-10 custom-scrollbar overflow-x-hidden">
          
          {/* QUICK ACTIONS */}
          <div className={`mb-2 ${sidebarCollapsed && !sidebarOpen ? 'flex justify-center px-0' : ''}`}>
            <button onClick={() => { setSidebarOpen(false); navigate('/admin/drives/new'); }}
              className={`bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-95 text-white flex items-center justify-center gap-2 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all group shrink-0
                ${sidebarCollapsed && !sidebarOpen ? 'w-10 h-10 p-0' : 'w-full py-3'}`}
              title="New Placement Drive"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300 shrink-0"/> 
              <span className={`transition-opacity duration-200 ${sidebarCollapsed && !sidebarOpen ? 'hidden opacity-0' : 'opacity-100'}`}>New Placement Drive</span>
            </button>
          </div>

          {/* MAIN */}
          <div>
            <div className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 ${sidebarCollapsed && !sidebarOpen ? 'text-center px-0' : 'px-3'}`}>
              {sidebarCollapsed && !sidebarOpen ? '—' : 'Overview'}
            </div>
            <div className="space-y-1">
              {[
                { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
                { name: 'Analytics', icon: BarChart2, path: '/admin/analytics' },
              ].map(item => {
                const isActive = location.pathname === item.path || (item.name === 'Dashboard' && location.pathname.startsWith('/admin/drives'));
                return (
                  <Link key={item.name} to={item.path} onClick={() => setSidebarOpen(false)} title={item.name}
                    className={`flex items-center gap-3 py-2.5 rounded-xl transition-all font-medium text-sm group shrink-0
                      ${isActive ? 'bg-indigo-500/10 text-indigo-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
                      ${sidebarCollapsed && !sidebarOpen ? 'justify-center px-0' : 'px-3'}`}>
                    <item.icon size={18} className={`shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300 transition-colors'}`}/>
                    <span className={`transition-opacity duration-200 ${sidebarCollapsed && !sidebarOpen ? 'hidden opacity-0 w-0' : 'opacity-100'}`}>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>


          {/* RECENT DRIVES (BACKEND CONNECTED) */}
          {recentDrives.length > 0 && (
            <div>
              <div className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center ${sidebarCollapsed && !sidebarOpen ? 'justify-center px-0' : 'justify-between px-3'}`}>
                {sidebarCollapsed && !sidebarOpen ? <Clock size={12} className="text-slate-600" /> : <>Recent Drives <Clock size={12} className="text-slate-600" /></>}
              </div>
              <div className="space-y-1">
                {recentDrives.slice(0, 5).map(d => (
                  <Link key={d._id} to={`/admin/drives/${d._id}`} onClick={() => { setSidebarOpen(false); setContextDriveId(d._id); }} title={d.companyName}
                     className={`flex items-center gap-3 py-2 rounded-xl transition-all font-medium text-sm group shrink-0
                       ${location.pathname === `/admin/drives/${d._id}` ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
                       ${sidebarCollapsed && !sidebarOpen ? 'justify-center px-0' : 'px-3'}`}>
                       <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 transition-colors
                         ${location.pathname === `/admin/drives/${d._id}` ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500 group-hover:bg-indigo-500/20 group-hover:text-indigo-400'}`}>
                         {d.companyName.substring(0, 2).toUpperCase()}
                       </div>
                       <span className={`truncate flex-1 transition-opacity duration-200 ${sidebarCollapsed && !sidebarOpen ? 'hidden opacity-0 w-0' : 'opacity-100'}`}>{d.companyName}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* SYSTEM */}
          <div>
            <div className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 ${sidebarCollapsed && !sidebarOpen ? 'text-center px-0' : 'px-3'}`}>
              {sidebarCollapsed && !sidebarOpen ? '—' : 'System'}
            </div>
            <div className="space-y-1">
              <Link to="/admin/settings" onClick={() => setSidebarOpen(false)} title="Settings"
                className={`flex items-center gap-3 py-2.5 rounded-xl transition-all font-medium text-sm group shrink-0
                  ${location.pathname.includes('/settings') ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
                  ${sidebarCollapsed && !sidebarOpen ? 'justify-center px-0' : 'px-3'}`}>
                <Settings size={18} className={`shrink-0 ${location.pathname.includes('/settings') ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}/> 
                <span className={`transition-opacity duration-200 ${sidebarCollapsed && !sidebarOpen ? 'hidden opacity-0 w-0' : 'opacity-100'}`}>Settings</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className={`p-4 border-t border-slate-800/50 relative z-10 ${sidebarCollapsed && !sidebarOpen ? 'flex flex-col items-center px-2' : ''}`}>
          <div className={`flex items-center gap-3 mb-2 rounded-xl group cursor-pointer hover:bg-slate-800/50 transition-colors ${sidebarCollapsed && !sidebarOpen ? 'p-1' : 'px-2 py-2'}`} title={user?.name}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 text-sm shrink-0">
               {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className={`flex-1 min-w-0 transition-opacity duration-200 ${sidebarCollapsed && !sidebarOpen ? 'hidden opacity-0 w-0' : 'opacity-100'}`}>
               <div className="text-sm font-semibold text-white truncate">{user?.name || 'Admin'}</div>
               <div className="text-[11px] text-slate-500 truncate">{user?.email || 'admin@campuspool.com'}</div>
            </div>
          </div>
          <button onClick={logout} title="Sign Out"
            className={`w-full flex items-center gap-2 font-semibold text-slate-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-all group shrink-0
              ${sidebarCollapsed && !sidebarOpen ? 'justify-center py-2.5 px-0' : 'px-3 py-2.5 text-sm'}`}>
             <LogOut size={16} className="shrink-0 group-hover:text-red-400 transition-colors"/> 
             <span className={`transition-opacity duration-200 ${sidebarCollapsed && !sidebarOpen ? 'hidden opacity-0 w-0' : 'opacity-100'}`}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen relative max-w-full transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Mobile sidebar toggle */}
        <div className={`md:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3`}>
          <button className="text-slate-600 hover:text-indigo-600" onClick={() => { setSidebarOpen(true); }}>
            <Menu size={24} />
          </button>
        </div>

        {/* Page Content */}
        <main className="flex-1 w-full bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
