import { useEffect, useState } from 'react';
import { Building2, Users, Activity, Loader2, Calendar, ChevronRight, Plus, ScanLine, TrendingUp, Target, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface Stats {
  total_drives: number;
  active_drives: number;
  total_students: number;
  system_status: string;
}

interface AnalyticsData {
  funnel: {
    registered: number;
    shortlisted: number;
    present: number;
    selected: number;
  };
  branch_distribution: { name: string; value: number }[];
  trends: { name: string; registrations: number }[];
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];

export default function AdminOverview() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDrives, setRecentDrives] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/drives/stats/summary').then(r => r.json()),
      fetch('/api/v1/drives/').then(r => r.json()),
      fetch('/api/v1/analytics/dashboard').then(r => r.json())
    ])
    .then(([statsData, drivesData, analyticsData]) => {
      setStats(statsData);
      setRecentDrives(drivesData.slice(0, 3));
      setAnalytics(analyticsData);
      setLoading(false);
    })
    .catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const cards = [
    { label: 'Active Drives', value: loading ? '—' : stats?.active_drives ?? 0, icon: <Activity size={24} />, gradient: 'from-blue-500/10 to-blue-500/5', color: 'text-blue-500', trend: 'Currently Running' },
    { label: 'Total Students', value: loading ? '—' : stats?.total_students ?? 0, icon: <Users size={24} />, gradient: 'from-emerald-500/10 to-emerald-500/5', color: 'text-emerald-500', trend: 'All-time Registered' },
    { label: 'Total Placements', value: loading ? '—' : analytics?.funnel.selected ?? 0, icon: <Briefcase size={24} />, gradient: 'from-purple-500/10 to-purple-500/5', color: 'text-purple-500', trend: 'Offers Generated' },
  ];

  const funnelData = analytics ? [
    { name: 'Registered', count: analytics.funnel.registered, fill: '#3b82f6' },
    { name: 'Shortlisted', count: analytics.funnel.shortlisted, fill: '#8b5cf6' },
    { name: 'Present', count: analytics.funnel.present, fill: '#f59e0b' },
    { name: 'Selected', count: analytics.funnel.selected, fill: '#10b981' }
  ] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live reporting and accreditation metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/drives/new" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition shadow-sm">
            <Plus size={18} /> New Drive
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.gradient} bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group`}>
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${card.color} opacity-5 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-muted-foreground font-medium text-sm mb-1">{card.label}</p>
                {loading ? (
                  <Loader2 size={28} className="animate-spin text-muted-foreground mt-2" />
                ) : (
                  <h2 className="text-4xl font-black text-foreground tracking-tight">{card.value}</h2>
                )}
              </div>
              <div className={`w-12 h-12 bg-background rounded-xl flex items-center justify-center shadow-sm border border-border ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground relative z-10">
              <span className="bg-background/80 px-2 py-1 rounded-md border border-border/50">{card.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Chart & Upcoming Drives */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Registration Trends */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" />
                Registration Trends
              </h3>
              <p className="text-sm text-muted-foreground">Student sign-ups over the last 7 days</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="registrations" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReg)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Placement Funnel */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Target size={18} className="text-blue-500" />
              Placement Funnel
            </h3>
            <p className="text-sm text-muted-foreground">Conversion rates across all drives</p>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.3)'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Third Row: Branch Analytics & Upcoming Drives */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Branch-wise Distribution */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Briefcase size={18} className="text-purple-500" />
              Branch-wise Placements
            </h3>
            <p className="text-sm text-muted-foreground">Distribution of total offers accepted</p>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full flex items-center justify-center">
            {loading ? (
              <Loader2 className="animate-spin text-muted-foreground" />
            ) : !analytics?.branch_distribution || analytics.branch_distribution.length === 0 ? (
              <p className="text-muted-foreground text-sm">No placement data available yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.branch_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {analytics.branch_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Upcoming Drives Section */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border bg-muted/20">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Calendar size={18} className="text-primary" /> Upcoming Drives
            </h3>
          </div>
          
          <div className="flex-1 p-0">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : recentDrives.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No active drives scheduled.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentDrives.map(drive => (
                  <Link 
                    to={`/admin/drives/${drive.id}`} 
                    key={drive.id}
                    className="flex items-center justify-between p-5 hover:bg-muted/30 transition group"
                  >
                    <div>
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {drive.company_name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Calendar size={12} />
                        {drive.drive_date ? new Date(drive.drive_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ChevronRight size={16} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-border bg-muted/10 text-center mt-auto">
            <Link to="/admin/drives" className="text-sm font-medium text-primary hover:underline">
              View all drives
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
