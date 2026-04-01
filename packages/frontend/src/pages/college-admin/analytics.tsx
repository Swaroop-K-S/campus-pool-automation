import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Users, UserCheck, Award, Percent } from 'lucide-react';
import { DownloadButton } from '../../components/shared/DownloadButton';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [branchData, setBranchData] = useState<any[]>([]);
  const [drivesHistory, setDrivesHistory] = useState<any[]>([]);
  const [monthTrend, setMonthTrend] = useState<any[]>([]);
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
      if (d.success) {
        setDrivesHistory(d.data);
        // Build month-wise trend from drives history
        const monthMap: Record<string, { month: string; applications: number; shortlisted: number; selected: number }> = {};
        for (const drive of d.data) {
          const date = drive.eventDate || drive.createdAt;
          if (!date) continue;
          const label = new Date(date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
          if (!monthMap[label]) monthMap[label] = { month: label, applications: 0, shortlisted: 0, selected: 0 };
          monthMap[label].applications += drive.applicationCount || 0;
          monthMap[label].shortlisted += drive.shortlistedCount || 0;
          monthMap[label].selected += drive.selectedCount || 0;
        }
        const sorted = Object.values(monthMap).sort((a, b) => {
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const [am, ay] = a.month.split(' ');
          const [bm, by] = b.month.split(' ');
          return ay !== by ? ay.localeCompare(by) : months.indexOf(am) - months.indexOf(bm);
        });
        setMonthTrend(sorted);
      }
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

  const selectionRate = summary?.totalApplications > 0
    ? ((summary?.selected / summary?.totalApplications) * 100).toFixed(1)
    : '0.0';

  const stats = [
    { label: 'Total Drives', value: summary?.totalDrives || 0, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Applications', value: summary?.totalApplications || 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Shortlisted', value: summary?.shortlisted || 0, icon: UserCheck, color: 'text-amber-600 bg-amber-50' },
    { label: 'Placed', value: summary?.selected || 0, icon: Award, color: 'text-green-600 bg-green-50' },
    { label: 'Selection Rate', value: `${selectionRate}%`, icon: Percent, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Analytics & Reports</h1>

      {/* ROW 1 — Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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

      {/* ROW 2b — Placement Trend Line Chart */}
      {monthTrend.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Placement Trend — Month Over Month</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              <Line type="monotone" dataKey="applications" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366F1' }} name="Applied" />
              <Line type="monotone" dataKey="shortlisted" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4, fill: '#F59E0B' }} name="Shortlisted" />
              <Line type="monotone" dataKey="selected" stroke="#10B981" strokeWidth={2.5} dot={{ r: 5, fill: '#10B981' }} name="Selected" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ROW 3 — Top Companies + Drive History Table side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Top Companies leaderboard */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Top Recruiters</h3>
          <div className="space-y-3">
            {drivesHistory
              .filter(d => d.selectedCount > 0)
              .sort((a, b) => b.selectedCount - a.selectedCount)
              .slice(0, 6)
              .map((d, i) => (
                <div key={d._id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-amber-700/60 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{d.companyName}</div>
                    <div className="text-xs text-slate-400 font-medium">{d.jobRole}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-emerald-600">{d.selectedCount}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">placed</div>
                  </div>
                </div>
              ))}
            {drivesHistory.filter(d => d.selectedCount > 0).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No completed drives yet</p>
            )}
          </div>
        </div>
        {/* Drive History Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
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
        </div>{/* End Drive History */}
      </div>{/* End Row 3 grid */}
    </div>
  );
}
