import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings, 
  LogOut,
  Building2,
  Bell
} from 'lucide-react';

export default function AdminDashboard() {
  const location = useLocation();

  const navItems = [
    { name: 'Overview', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Drives', path: '/admin/drives', icon: <Building2 size={20} /> },
    { name: 'Students', path: '/admin/students', icon: <Users size={20} /> },
    { name: 'Calendar', path: '/admin/calendar', icon: <Calendar size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar (Left Pane) */}
      <aside className="w-64 bg-card border-r border-border flex flex-col transition-all duration-300 shadow-sm z-10">
        
        {/* Brand/Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-xl mr-3">
            C
          </div>
          <span className="text-xl font-bold text-foreground">CampusPool</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary/20 text-primary font-medium' 
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <span className={`mr-3 ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile / Logout */}
        <div className="p-4 border-t border-border">
          <button className="flex items-center w-full px-3 py-2 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-md transition-colors">
            <LogOut size={20} className="mr-3 text-muted-foreground/70" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content (Right Pane) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8 shadow-sm z-0">
          <h2 className="text-xl font-semibold text-foreground">
            {navItems.find(item => location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path)))?.name || 'Dashboard'}
          </h2>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 text-muted-foreground hover:text-primary relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-border"></div>
          </div>
        </header>

        {/* Dynamic Outlet Area */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
