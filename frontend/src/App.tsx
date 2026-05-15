import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Building2, Users, Activity, Loader2 } from 'lucide-react';

import StudentHub from './pages/StudentHub/StudentHub';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import DriveWizard from './pages/AdminDashboard/DriveWizard/DriveWizard';
import DriveDetail from './pages/AdminDashboard/DriveDetail/DriveDetail';
import DrivesList from './pages/AdminDashboard/DrivesList';
import AdminLogin from './pages/Auth/AdminLogin';
import StudentRegistration from './pages/Public/StudentRegistration';

interface Stats { total_drives: number; active_drives: number; total_students: number; system_status: string; }

function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/drives/stats/summary')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Active Drives',    value: loading ? '—' : stats?.active_drives ?? 0,   icon: <Activity size={22} className="text-primary" />,  border: 'border-b-primary' },
    { label: 'Total Students',   value: loading ? '—' : stats?.total_students ?? 0,  icon: <Users size={22} className="text-emerald-600" />,  border: 'border-b-emerald-500' },
    { label: 'Total Drives',     value: loading ? '—' : stats?.total_drives ?? 0,    icon: <Building2 size={22} className="text-primary" />,  border: 'border-b-primary' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Live data from MongoDB</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map(card => (
          <div key={card.label} className={`bg-card text-card-foreground p-6 rounded-xl shadow-md border border-border border-b-[3px] ${card.border} hover:shadow-lg hover:-translate-y-1 transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-muted-foreground font-medium text-sm">{card.label}</h2>
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">{card.icon}</div>
            </div>
            {loading
              ? <Loader2 size={24} className="animate-spin text-muted-foreground" />
              : <p className="text-4xl font-black text-foreground">{card.value}</p>
            }
          </div>
        ))}
      </div>

      {/* System status */}
      <div className="mt-6 bg-card border border-border rounded-xl p-5 flex items-center gap-3 shadow-sm">
        <div className={`w-3 h-3 rounded-full ${stats?.system_status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground'} animate-pulse`} />
        <span className="text-sm font-medium text-foreground">
          System {stats?.system_status === 'online' ? 'Online' : 'Checking...'}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">MongoDB Atlas • FastAPI • Vite</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Routes>
          {/* Public / Student Routes */}
          <Route path="/" element={<StudentHub />} />
          <Route path="/register/:driveId" element={<StudentRegistration />} />
          
          {/* Admin Authentication */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Admin Routes with Dashboard Layout Wrapper */}
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<AdminOverview />} />
            <Route path="drives" element={<DrivesList />} />
            <Route path="drives/new" element={<DriveWizard />} />
            <Route path="drives/:id" element={<DriveDetail />} />
            <Route path="students" element={<div>Students Panel (Coming Soon)</div>} />
            <Route path="calendar" element={<div>Calendar Sync (Coming Soon)</div>} />
            <Route path="settings" element={<div>System Settings (Coming Soon)</div>} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
