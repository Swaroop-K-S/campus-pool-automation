import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Shield, AlertTriangle, Search, RefreshCcw, X, Check,
  Trash2, ChevronUp, ChevronDown, Clock, Loader2
} from 'lucide-react';

const STRIKE_COLORS: Record<number, string> = {
  1: 'bg-amber-50 text-amber-700 border-amber-200',
  2: 'bg-orange-50 text-orange-700 border-orange-200',
};
const getStrikeStyle = (s: number) => s >= 2 ? STRIKE_COLORS[2] : STRIKE_COLORS[1] ?? 'bg-slate-100 text-slate-600 border-slate-200';

export default function StudentsPage() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState<'watchlist' | 'all'>('watchlist');
  const [clearingUsn, setClearingUsn] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<any | null>(null);
  const [clearReason, setClearReason] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/students/watchlist');
      if (res.success) setWatchlist(res.data);
    } catch { toast.error('Failed to load watchlist'); }
    finally { setLoading(false); }
  };

  const fetchAllStudents = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/students?search=${encodeURIComponent(search)}&limit=100`);
      if (res.success) setAllStudents(res.data.students || []);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWatchlist(); }, []);
  useEffect(() => { if (activeTab === 'all') fetchAllStudents(); }, [activeTab, search]);

  const handleClearStrikes = async (student: any) => {
    setClearingUsn(student.usn);
    try {
      await api.post(`/students/${student.usn}/strikes/clear`, { reason: clearReason });
      toast.success(`Strikes cleared for ${student.name || student.usn}`);
      setConfirmClear(null);
      setClearReason('');
      fetchWatchlist();
      if (activeTab === 'all') fetchAllStudents();
    } catch { toast.error('Failed to clear strikes'); }
    finally { setClearingUsn(null); }
  };

  const sorted = (list: any[]) =>
    [...list].sort((a, b) => sortDir === 'desc' ? b.strikes - a.strikes : a.strikes - b.strikes);

  const displayed = activeTab === 'watchlist' ? sorted(watchlist) : sorted(allStudents);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-100">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Student Watchlist</h1>
              <p className="text-slate-500 text-sm mt-0.5">Track & manage student conduct records across all placement drives</p>
            </div>
          </div>
          <button onClick={fetchWatchlist} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
            <RefreshCcw size={15} /> Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Flagged', value: watchlist.length, color: 'from-amber-50 to-orange-50 border-amber-200 text-amber-700', icon: AlertTriangle },
            { label: 'Critical (2+)', value: watchlist.filter(s => s.strikes >= 2).length, color: 'from-red-50 to-rose-50 border-red-200 text-red-700', icon: AlertTriangle },
            { label: 'One Strike', value: watchlist.filter(s => s.strikes === 1).length, color: 'from-amber-50 to-yellow-50 border-amber-200 text-amber-600', icon: AlertTriangle },
            { label: 'Cleared Today', value: 0, color: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-700', icon: Check },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className={`bg-gradient-to-br ${color} border rounded-2xl p-4 flex items-center gap-3 shadow-sm`}>
              <Icon size={20} />
              <div>
                <p className="text-2xl font-black">{value}</p>
                <p className="text-xs font-bold opacity-70">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { key: 'watchlist', label: `Watchlist (${watchlist.length})` },
                { key: 'all', label: 'All Students' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === t.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >{t.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search USN, name..."
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-56"
                />
              </div>
              <button
                onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Strikes {sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>
          </div>

          {/* Table */}
          {loading && activeTab === 'watchlist' ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-3" /> Loading watchlist...
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                <Shield size={28} />
              </div>
              <p className="font-bold text-slate-700 text-lg">
                {activeTab === 'watchlist' ? 'No flagged students' : 'No students found'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {activeTab === 'watchlist' ? 'All students have a clean conduct record.' : 'Students appear here after applying to a drive.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Student', 'USN', 'Branch', 'Strikes', 'Last Seen', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed
                    .filter(s => !search || s.usn?.toLowerCase().includes(search.toLowerCase()) || s.name?.toLowerCase().includes(search.toLowerCase()))
                    .map(student => (
                      <tr key={student._id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-sm shrink-0">
                              {(student.name || student.usn || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{student.name || '—'}</p>
                              <p className="text-xs text-slate-400">{student.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-bold text-slate-700">{student.usn}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{student.branch || '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1.5 rounded-xl text-sm font-black border ${getStrikeStyle(student.strikes || 0)}`}>
                            {student.strikes || 0} {student.strikes === 1 ? 'strike' : 'strikes'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock size={12} />
                            {student.lastSeen ? new Date(student.lastSeen).toLocaleDateString('en-IN') : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {(student.strikes || 0) > 0 ? (
                            <button
                              onClick={() => setConfirmClear(student)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                            >
                              <X size={12} /> Clear Strikes
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300 font-medium">Clean record</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Clear Strikes Confirmation Modal */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center text-emerald-600">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Clear Strike Record</h3>
                <p className="text-sm text-slate-500">This action will be logged in the audit trail.</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
              <p className="text-sm font-bold text-slate-700">{confirmClear.name || confirmClear.usn}</p>
              <p className="text-xs text-slate-500 mt-0.5">{confirmClear.usn} · {confirmClear.branch}</p>
              <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-black border mt-3 ${getStrikeStyle(confirmClear.strikes)}`}>
                {confirmClear.strikes} {confirmClear.strikes === 1 ? 'strike' : 'strikes'} → 0 strikes
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Reason (optional)</label>
              <input
                type="text"
                value={clearReason}
                onChange={e => setClearReason(e.target.value)}
                placeholder="e.g. Student provided valid documentation..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setConfirmClear(null); setClearReason(''); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button
                onClick={() => handleClearStrikes(confirmClear)}
                disabled={clearingUsn === confirmClear.usn}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all"
              >
                {clearingUsn === confirmClear.usn ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Clear Strikes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
