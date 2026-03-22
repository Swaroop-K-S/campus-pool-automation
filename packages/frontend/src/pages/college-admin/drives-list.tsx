import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export default function DrivesListPage() {
  const navigate = useNavigate();
  const [drives, setDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDrives();
  }, []);

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await api.get('/drives');
      if (res.data?.success) {
        setDrives(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load drives');
    } finally {
      setLoading(false);
    }
  };

  const activateDrive = async (id: string, e: any) => {
    e.stopPropagation();
    try {
      const res = await api.patch(`/drives/${id}/activate`);
      if (res.data?.success) {
        toast.success('Drive activated successfully');
        fetchDrives();
      }
    } catch (err) {
      toast.error('Failed to activate drive');
    }
  };

  const filteredDrives = drives.filter(d => {
    if (filter !== 'All') {
      const statusMap: any = {
        'Draft': 'draft',
        'Active': 'active',
        'Event Day': 'event_day',
        'Completed': 'completed'
      };
      if (d.status !== statusMap[filter]) return false;
    }
    if (search && !d.companyName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Active</span>;
      case 'event_day': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Event Day</span>;
      case 'completed': return <span className="bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>;
      default: return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Draft</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Placement Drives</h1>
        <button 
          onClick={() => navigate('/admin/drives/new')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm"
        >
          <Plus size={16} strokeWidth={3} /> New Drive
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {['All', 'Draft', 'Active', 'Event Day', 'Completed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${filter === f ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <input 
          type="text"
          placeholder="Search by company name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none text-sm font-medium"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          [1,2,3,4,5].map(i => (
             <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0 mb-4 md:mb-0"></div>
                <div className="h-6 w-32 bg-slate-200 rounded"></div>
             </div>
          ))
        ) : filteredDrives.length > 0 ? (
          filteredDrives.map(drive => (
            <div 
              key={drive._id} 
              onClick={() => navigate('/admin/drives/' + drive._id)}
              className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              
              <div className="flex items-center gap-5 w-full md:w-1/3 mb-4 md:mb-0">
                <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xl flex items-center justify-center shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                  {drive.companyName ? drive.companyName.substring(0,2).toUpperCase() : 'CP'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1">{drive.companyName}</h3>
                  <p className="text-slate-500 font-medium text-sm mb-1.5">{drive.jobRole || 'Software Engineer'}</p>
                  <span className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold">
                    {drive.ctc?.amount ? `${drive.ctc.amount} LPA` : 'TBD'}
                  </span>
                </div>
              </div>

              <div className="flex gap-8 w-full md:w-1/3 justify-center mb-4 md:mb-0 items-center">
                <div className="text-center">
                  <p className="font-black text-lg text-slate-800">{drive.applicationsCount || 0}</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Applications</p>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-2">{getStatusBadge(drive.status)}</div>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div className="text-center">
                  <p className="font-bold text-sm text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    {drive.date ? new Date(drive.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : 'TBD'}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Event Date</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 w-full md:w-1/3">
                {drive.status === 'draft' && (
                  <button 
                    onClick={(e) => activateDrive(drive._id, e)}
                    className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    Activate
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate('/admin/drives/' + drive._id); }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center text-sm px-4 py-2"
                >
                  View &rarr;
                </button>
              </div>

            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm border-dashed">
            <h3 className="text-xl font-bold text-slate-800 mb-2">No placement drives found</h3>
            <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">Either refine your status filters or create a new placement drive to get started.</p>
            <button 
              onClick={() => navigate('/admin/drives/new')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center justify-center mx-auto gap-2 font-bold shadow-sm transition-colors"
            >
              <Plus size={18} strokeWidth={3} /> New Drive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
