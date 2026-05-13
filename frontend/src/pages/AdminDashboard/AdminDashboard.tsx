import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  LogOut,
  Building2,
  Bell,
  Shield,
} from 'lucide-react';

export default function AdminDashboard() {
  const location = useLocation();

  const navItems = [
    { name: 'Overview',  path: '/admin',          icon: <LayoutDashboard size={19} /> },
    { name: 'Drives',    path: '/admin/drives',    icon: <Building2 size={19} /> },
    { name: 'Students',  path: '/admin/students',  icon: <Users size={19} /> },
    { name: 'Calendar',  path: '/admin/calendar',  icon: <Calendar size={19} /> },
    { name: 'Settings',  path: '/admin/settings',  icon: <Settings size={19} /> },
  ];

  const isActive = (path: string) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(path);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f1f5f9' }}>

      {/* ── NAVY SIDEBAR ── */}
      <aside
        className="w-64 flex flex-col flex-shrink-0 shadow-xl z-20"
        style={{ background: '#0a1b3f' }}
      >
        {/* Logo */}
        <div
          className="h-16 flex items-center px-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-base mr-3 flex-shrink-0"
            style={{ background: '#c49a6c', color: '#0a1b3f' }}
          >
            C
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">CampusPool</p>
            <p className="text-xs leading-none mt-0.5" style={{ color: '#c49a6c' }}>Admin Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className="flex items-center px-3 py-2.5 rounded-lg transition-all group"
                style={{
                  background: active ? 'rgba(196,154,108,0.15)' : 'transparent',
                  color: active ? '#c49a6c' : 'rgba(255,255,255,0.6)',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  }
                }}
              >
                {/* Active indicator bar */}
                <div
                  className="w-0.5 h-5 rounded-full mr-3 flex-shrink-0 transition-all"
                  style={{ background: active ? '#c49a6c' : 'transparent' }}
                />
                <span className="mr-3 flex-shrink-0">{item.icon}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin badge + Logout */}
        <div
          className="p-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Admin badge */}
          <div
            className="flex items-center px-3 py-2.5 rounded-lg mb-2"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0"
              style={{ background: 'rgba(196,154,108,0.2)', border: '1px solid rgba(196,154,108,0.4)' }}
            >
              <Shield size={15} style={{ color: '#c49a6c' }} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white leading-none truncate">Admin</p>
              <p className="text-xs leading-none mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Sapthagiri NPS
              </p>
            </div>
          </div>

          <button
            className="flex items-center w-full px-3 py-2 rounded-lg transition-all text-sm"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={17} className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">

        {/* Top Header */}
        <header
          className="h-16 flex items-center justify-between px-8 flex-shrink-0 bg-card shadow-sm"
          style={{ borderBottom: '1px solid #e2e8f0' }}
        >
          <h2 className="text-lg font-bold text-foreground">
            {navItems.find(item => isActive(item.path))?.name ?? 'Dashboard'}
          </h2>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg transition-colors relative hover:bg-secondary text-muted-foreground hover:text-foreground">
              <Bell size={19} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: '#c49a6c', color: '#0a1b3f' }}
            >
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
