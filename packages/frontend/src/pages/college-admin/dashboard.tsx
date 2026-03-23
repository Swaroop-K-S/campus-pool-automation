import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, CheckCircle2, Award, Plus, Building2, LayoutDashboard } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activePools: 0,
    applications: 0,
    shortlisted: 0,
    selected: 0
  });
  const [drives, setDrives] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Using Promise.all to fetch both simultaneously
        const [statsRes, drivesRes] = await Promise.all([
          api.get('/analytics/summary').catch(() => null),
          api.get('/drives?status=active&limit=5').catch(() => null)
        ]);

        if (statsRes?.success && statsRes.data) {
           setStats({
             activePools: statsRes.data.activePools || 0,
             applications: statsRes.data.totalApplications || 0,
             shortlisted: statsRes.data.shortlisted || 0,
             selected: statsRes.data.selected || 0
           });
        }
        
        if (drivesRes?.success && Array.isArray(drivesRes.data)) {
           const activeOrEvent = drivesRes.data.filter((d: any) => d.status === 'active' || d.status === 'event_day');
           setDrives(activeOrEvent.slice(0, 5));
        }

      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Active</span>;
      case 'event_day': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Event Day</span>;
      case 'completed': return <span className="bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>;
      default: return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Draft</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* ROW 1: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={24} />
             </div>
             <div>
                <p className="text-3xl font-black text-slate-800">{loading ? '-' : stats.activePools}</p>
                <p className="text-sm text-slate-500 font-semibold tracking-wide mt-0.5 uppercase">Active Pools</p>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Users size={24} />
             </div>
             <div>
                <p className="text-3xl font-black text-slate-800">{loading ? '-' : stats.applications}</p>
                <p className="text-sm text-slate-500 font-semibold tracking-wide mt-0.5 uppercase">Total Applications</p>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
             </div>
             <div>
                <p className="text-3xl font-black text-slate-800">{loading ? '-' : stats.shortlisted}</p>
                <p className="text-sm text-slate-500 font-semibold tracking-wide mt-0.5 uppercase">Shortlisted</p>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <Award size={24} />
             </div>
             <div>
                <p className="text-3xl font-black text-slate-800">{loading ? '-' : stats.selected}</p>
                <p className="text-sm text-slate-500 font-semibold tracking-wide mt-0.5 uppercase">Selected</p>
             </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800">Active Placement Pools</h2>
        <button 
          onClick={() => navigate('/admin/drives/new')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={18} strokeWidth={3} /> Create New Pool
        </button>
      </div>

      {/* ROW 3: Drives List */}
      <div className="space-y-4">
        {loading ? (
          // Skeletons
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center justify-between animate-pulse">
               <div className="flex items-center gap-4 w-1/3">
                  <div className="w-12 h-12 rounded-lg bg-slate-200 shrink-0"></div>
                  <div className="space-y-2 w-full">
                     <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                     <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
               </div>
               <div className="flex gap-12 w-1/3 justify-center">
                  <div className="h-10 bg-slate-200 rounded w-16"></div>
                  <div className="h-10 bg-slate-200 rounded w-16"></div>
               </div>
               <div className="w-1/4 flex justify-end gap-4">
                  <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                  <div className="h-8 bg-slate-200 rounded w-24"></div>
               </div>
            </div>
          ))
        ) : drives.length > 0 ? (
          <>
            {drives.map((drive) => (
              <div key={drive._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                
                {/* Left Side */}
                <div className="flex items-center gap-5 w-1/3">
                  <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                    {drive.companyName ? drive.companyName.substring(0, 2).toUpperCase() : 'CP'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{drive.companyName}</h3>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-600 font-medium text-sm flex items-center gap-1.5">
                        <Briefcase size={14} className="text-slate-400" /> {drive.jobRole || 'Software Engineer'} • {drive.ctc || 'TBD'}
                      </span>
                      <span className="text-slate-500 text-xs flex items-center gap-1.5 font-medium">
                        <Building2 size={12} className="text-slate-400" /> 
                        {Array.isArray(drive.locations) && drive.locations.length > 0 ? drive.locations.join(', ') : 'Bangalore'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center Stats */}
                <div className="flex justify-center gap-8 w-1/3">
                  <div className="text-center">
                    <p className="text-slate-800 font-bold text-lg">{drive.applicationsCount || 0}</p>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Applications</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-slate-800 font-bold text-lg">{drive.shortlistedCount || 0}</p>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Shortlisted</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-slate-800 font-bold text-sm bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg mt-0.5 h-8 flex items-center justify-center">
                      {drive.date ? new Date(drive.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : 'TBD'}
                    </p>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mt-1">Event Date</p>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2 sm:gap-4 w-1/3 flex-1">
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    {/* Form Status Badge */}
                    {drive.formStatus === 'open' || drive.formStatus === 'extended' ? (
                       <span className="bg-green-100/50 text-green-700 text-xs font-bold px-2 py-1 rounded-lg border border-green-200 flex items-center gap-1.5 shadow-sm">
                         <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Accepting
                       </span>
                    ) : drive.formStatus === 'scheduled' ? (
                       <span className="bg-amber-100/50 text-amber-700 text-xs font-bold px-2 py-1 rounded-lg border border-amber-200 flex items-center shadow-sm">
                         Scheduled
                       </span>
                    ) : drive.formStatus === 'closed' ? (
                       <span className="bg-red-100/50 text-red-700 text-xs font-bold px-2 py-1 rounded-lg border border-red-200 shadow-sm opacity-90">
                         Forms Closed
                       </span>
                    ) : null}

                    {/* Drive Status Badge */}
                    {getStatusBadge(drive.status)}
                  </div>
                  <button 
                    onClick={() => navigate(`/admin/drives/${drive._id}`)}
                    className="text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-colors px-4 py-2 w-full sm:w-auto text-center rounded-lg font-bold text-sm"
                  >
                    Manage Pool &rarr;
                  </button>
                </div>
              </div>
            ))}
            <div className="text-center pt-4">
               <button 
                 onClick={() => navigate('/admin/drives')}
                 className="text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors decoration-slate-300 hover:underline underline-offset-4"
               >
                 View All Drives &rarr;
               </button>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl border-2 border-slate-200 border-dashed p-16 flex flex-col items-center justify-center text-center">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50">
                <Briefcase size={32} className="text-slate-400" />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">No Active Placement Pools</h3>
             <p className="text-slate-500 font-medium mb-8 max-w-sm">Create your first placement pool to get started with recruiting on CampusPool.</p>
             <button 
               onClick={() => navigate('/admin/drives/new')}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
             >
               <Plus size={18} strokeWidth={3} /> Create Your First Pool
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
