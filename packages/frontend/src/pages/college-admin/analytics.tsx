import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Users, UserCheck, Award, Percent, PieChart as PieChartIcon } from 'lucide-react';
import { DownloadButton } from '../../components/shared/DownloadButton';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Animated Number Component
function AnimatedCounter({ value, suffix = '', isFloat = false, duration = 1500 }: { value: number | string, suffix?: string, isFloat?: boolean, duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numericValue)) return;
    if (numericValue === 0) {
      setCount(0);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // easeOutExpo for dramatic slowdown at the end
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(numericValue * easeProgress);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(numericValue);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value, duration]);

  const displayValue = isFloat ? count.toFixed(1) : Math.floor(count);
  return <>{displayValue}{suffix}</>;
}

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
    { label: 'Selection Rate', value: selectionRate, suffix: '%', icon: Percent, color: 'text-purple-600 bg-purple-50', isFloat: true },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500 relative z-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Analytics & Reports</h1>
        <DownloadButton
          url="/analytics/export/summary"
          label="Download Full PDF"
          variant="primary"
          size="sm"
        />
      </div>

      {/* ROW 1 — Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm transform transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-500">{s.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={18} />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-800">
              <AnimatedCounter value={s.value} suffix={s.suffix} isFloat={s.isFloat} />
            </div>
          </div>
        ))}
      </div>

      {/* ROW 2 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Bar Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Application Funnel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
              <Bar dataKey="count" fill="url(#colorUv)" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out">
                 {/* Creating a sexy gradient for the bar */}
                 <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Selected by Branch</h3>
          {branchData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={branchData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="count" paddingAngle={4} stroke="none" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out"
                  label={({ branch, percent }: any) => percent > 0.05 ? `${branch}` : ''}
                  labelLine={false}
                >
                  {branchData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm font-medium">
              <div className="flex flex-col items-center">
                <PieChartIcon size={32} className="opacity-20 mb-3" />
                No selected students yet
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 2b — Placement Trend Line Chart */}
      {monthTrend.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Placement Trend — Month Over Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16, fontWeight: 700, color: '#475569' }} iconType="circle" />
              <Line type="monotone" dataKey="applications" stroke="#6366F1" strokeWidth={3} dot={{ r: 5, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} name="Applied" isAnimationActive={true} animationDuration={2000} animationEasing="ease-out" />
              <Line type="monotone" dataKey="shortlisted" stroke="#F59E0B" strokeWidth={3} dot={{ r: 5, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} name="Shortlisted" isAnimationActive={true} animationDuration={2000} animationEasing="ease-out" />
              <Line type="monotone" dataKey="selected" stroke="#10B981" strokeWidth={3} dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} name="Selected" isAnimationActive={true} animationDuration={2000} animationEasing="ease-out" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ROW 3 — Top Companies + Drive History Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Top Companies leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            Top Recruiters <Award className="text-amber-500 fill-amber-500/20" size={20} />
          </h3>
          <div className="space-y-4">
            {drivesHistory
              .filter(d => d.selectedCount > 0)
              .sort((a, b) => b.selectedCount - a.selectedCount)
              .slice(0, 6)
              .map((d, i) => (
                <div key={d._id} className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 hover:bg-slate-50 transition-colors group">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
                    i === 0 ? 'bg-amber-100 drop-shadow-md' : i === 1 ? 'bg-slate-200 drop-shadow-sm' : i === 2 ? 'bg-orange-100 drop-shadow-sm' : 'bg-slate-100 text-slate-400 text-base font-black border border-slate-200'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{d.companyName}</div>
                    <div className="text-xs text-slate-500 font-medium truncate">{d.jobRole}</div>
                  </div>
                  <div className="text-right shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="text-sm font-black text-emerald-600"><AnimatedCounter value={d.selectedCount} /></div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">placed</div>
                  </div>
                </div>
              ))}
            {drivesHistory.filter(d => d.selectedCount > 0).length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <Award size={48} className="text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 font-medium">No completed placements yet</p>
              </div>
            )}
          </div>
        </div>
        {/* Drive History Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Operational Log</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Historically completed and active placement drives.</p>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 font-bold text-slate-600 text-xs tracking-wider uppercase">Company</th>
                  <th className="text-left p-4 font-bold text-slate-600 text-xs tracking-wider uppercase">Role</th>
                  <th className="text-center p-4 font-bold text-slate-600 text-xs tracking-wider uppercase">Applied</th>
                  <th className="text-center p-4 font-bold text-slate-600 text-xs tracking-wider uppercase">L1 Passed</th>
                  <th className="text-center p-4 font-bold text-slate-600 text-xs tracking-wider uppercase" title="Final Offers">Offered</th>
                  <th className="text-right p-4 font-bold text-slate-600 text-xs tracking-wider uppercase">Win Rate</th>
                  <th className="text-right p-4 font-bold text-slate-600 text-xs tracking-wider uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivesHistory.map((d: any) => {
                  const conv = d.applicationCount > 0 ? ((d.selectedCount / d.applicationCount) * 100).toFixed(1) : '0.0';
                  const convNum = parseFloat(conv);
                  const convColor = convNum > 20 ? 'text-emerald-600' : convNum > 10 ? 'text-amber-500' : 'text-slate-400';
                  return (
                    <tr key={d._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 font-black text-slate-800">{d.companyName}</td>
                      <td className="p-4 text-slate-600 font-medium">{d.jobRole}</td>
                      <td className="p-4 text-center text-slate-500 font-bold bg-slate-50/50"><AnimatedCounter value={d.applicationCount || 0} /></td>
                      <td className="p-4 text-center text-indigo-600 font-bold bg-indigo-50/30"><AnimatedCounter value={d.shortlistedCount || 0} /></td>
                      <td className="p-4 text-center text-emerald-600 font-black bg-emerald-50/30"><AnimatedCounter value={d.selectedCount || 0} /></td>
                      <td className={`p-4 text-right font-black tracking-wide ${convColor}`}>{conv}%</td>
                      <td className="p-4 text-right">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                          d.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          d.status === 'event_day' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          d.status === 'completed' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>{d.status.replace('_', ' ')}</span>
                      </td>
                    </tr>
                  );
                })}
                {drivesHistory.length === 0 && (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-medium">No drives available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
