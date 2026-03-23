import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Users, Upload, Grid3X3 } from 'lucide-react';

export default function HRDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [drive, setDrive] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, attended: 0, passed: 0, selected: 0 });

  useEffect(() => {
    document.title = 'HR Dashboard — CampusPool';
    // HR user has driveId in their JWT payload
    const driveId = (user as any)?.driveId;
    if (driveId) {
      api.get(`/drives/${driveId}`).then((d: any) => {
        if (d.success) {
          setDrive(d.data);
          // Get app counts
          api.get(`/drives/${driveId}/applications`).then((a: any) => {
            const apps = a.data?.applications || a.data || [];
            setStats({
              total: apps.length,
              attended: apps.filter((x: any) => ['attended', 'selected'].includes(x.status) || x.status?.includes('passed')).length,
              passed: apps.filter((x: any) => x.status?.includes('passed')).length,
              selected: apps.filter((x: any) => x.status === 'selected').length,
            });
          });
        }
      });
    }
  }, [user]);

  const quickActions = [
    { title: 'View Students', desc: 'See all student profiles', icon: Users, path: '/hr/students', color: 'bg-blue-50 text-blue-600' },
    { title: 'Upload Results', desc: 'Upload round pass list', icon: Upload, path: '/hr/upload-results', color: 'bg-indigo-50 text-indigo-600' },
    { title: 'GD Assignments', desc: 'View room assignments', icon: Grid3X3, path: '/hr/gd-assignments', color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Welcome Card */}
      <div className="bg-indigo-600 rounded-2xl p-6 text-white mb-6">
        <h2 className="text-2xl font-bold">Welcome, {user?.name || 'HR'}</h2>
        <p className="text-indigo-200 mt-1">{drive?.companyName || 'Company'} • {drive?.jobRole || 'Role'}</p>
        {drive && (
          <span className={`mt-3 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
            drive.status === 'event_day' ? 'bg-white/20' : drive.status === 'active' ? 'bg-green-400/20 text-green-100' : 'bg-slate-400/20'
          }`}>{drive.status?.replace('_', ' ')}</span>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Students', value: stats.total },
          { label: 'Attended', value: stats.attended },
          { label: 'Passed Rounds', value: stats.passed },
          { label: 'Selected', value: stats.selected },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-black text-slate-800">{s.value}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {quickActions.map(a => (
          <button key={a.title} onClick={() => navigate(a.path)}
            className="bg-white rounded-xl border border-slate-200 p-6 text-left hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className={`w-12 h-12 rounded-xl ${a.color} flex items-center justify-center mb-4`}>
              <a.icon size={24} />
            </div>
            <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{a.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{a.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
