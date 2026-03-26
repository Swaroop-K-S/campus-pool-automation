import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, UserCheck, Award } from 'lucide-react';
import { DownloadButton } from '../../components/shared/DownloadButton';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [branchData, setBranchData] = useState<any[]>([]);
  const [drivesHistory, setDrivesHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Analytics — CampusPool';
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/analytics/branch-distribution'),
      api.get('/analytics/drives-history')
    ]).then(([s, b, d]: any[]) => {
      if (s.success) {
        setSummary(s.data);
        setFunnelData([
          { stage: 'Applied', count: s.data.funnel?.applied || 0 },
          { stage: 'Shortlisted', count: s.data.funnel?.shortlisted || 0 },
          { stage: 'Interviewed', count: s.data.funnel?.interviewed || 0 },
          { stage: 'Selected', count: s.data.funnel?.selected || 0 },
        ]);
      }
      if (b.success) setBranchData(b.data);
      if (d.success) setDrivesHistory(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-xl" />)}
      </div>
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 h-80 bg-slate-200 animate-pulse rounded-xl" />
        <div className="col-span-2 h-80 bg-slate-200 animate-pulse rounded-xl" />
      </div>
    </div>
  );

  const stats = [
    { label: 'Total Drives', value: summary?.totalDrives || 0, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Applications', value: summary?.totalApplications || 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Shortlisted', value: summary?.shortlisted || 0, icon: UserCheck, color: 'text-amber-600 bg-amber-50' },
    { label: 'Selected', value: summary?.selected || 0, icon: Award, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Analytics & Reports</h1>

      {/* ROW 1 — Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{s.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={18} />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-800">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ROW 2 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Bar Chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Application Funnel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Selected by Branch</h3>
          {branchData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={branchData} cx="50%" cy="50%" outerRadius={100} dataKey="count"
                  label={({ branch, percent }: any) => `${branch} ${(percent * 100).toFixed(0)}%`}>
                  {branchData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              No selected students yet
            </div>
          )}
        </div>
      </div>

      {/* ROW 3 — Drive History Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Drive History</h3>
          <DownloadButton
            url="/analytics/export/summary"
            label="Download Full Report"
            variant="primary"
            size="sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-600">Company</th>
                <th className="text-left p-3 font-semibold text-slate-600">Role</th>
                <th className="text-center p-3 font-semibold text-slate-600">Applied</th>
                <th className="text-center p-3 font-semibold text-slate-600">L1 Passed</th>
                <th className="text-center p-3 font-semibold text-slate-600">Attended</th>
                <th className="text-center p-3 font-semibold text-slate-600" title="Final Offers">Offered</th>
                <th className="text-right p-3 font-semibold text-slate-600">Conversion</th>
                <th className="text-right p-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {drivesHistory.map((d: any) => {
                const conv = d.applicationCount > 0 ? ((d.selectedCount / d.applicationCount) * 100).toFixed(1) : '0.0';
                const convNum = parseFloat(conv);
                const convColor = convNum > 20 ? 'text-green-600' : convNum > 10 ? 'text-amber-600' : 'text-slate-500';
                return (
                  <tr key={d._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 font-black text-slate-800">{d.companyName}</td>
                    <td className="p-3 text-slate-600 font-medium">{d.jobRole}</td>
                    <td className="p-3 text-center text-slate-500 font-medium bg-slate-50/50">{d.applicationCount || 0}</td>
                    <td className="p-3 text-center text-indigo-600 font-semibold bg-indigo-50/30">{d.shortlistedCount || 0}</td>
                    <td className="p-3 text-center text-amber-600 font-semibold bg-amber-50/30">{d.attendedCount || 0}</td>
                    <td className="p-3 text-center text-green-700 font-black bg-green-50/30">{d.selectedCount || 0}</td>
                    <td className={`p-3 text-right font-bold ${convColor}`}>{conv}%</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        d.status === 'active' ? 'bg-green-100 text-green-700' :
                        d.status === 'event_day' ? 'bg-indigo-100 text-indigo-700' :
                        d.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>{d.status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                );
              })}
              {drivesHistory.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">No drives yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
