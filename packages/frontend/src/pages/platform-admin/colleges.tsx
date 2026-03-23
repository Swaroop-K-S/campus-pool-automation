import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Search, Plus, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function CollegesPage() {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', subdomain: '', adminEmail: '', adminPassword: '', adminName: '' });

  useEffect(() => {
    document.title = 'Colleges — Platform Admin';
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const data: any = await api.get('/platform/colleges');
      if (data.success) setColleges(data.data || []);
    } catch {}
    setLoading(false);
  };

  const handleAdd = async () => {
    try {
      const data: any = await api.post('/platform/colleges', form);
      if (data.success) {
        toast.success('College added!');
        setShowAdd(false);
        setForm({ name: '', subdomain: '', adminEmail: '', adminPassword: '', adminName: '' });
        fetchColleges();
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch { toast.error('Error adding college'); }
  };

  const filtered = colleges.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="h-10 bg-slate-200 animate-pulse rounded-lg w-64 mb-6" />
      {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-lg mb-2" />)}
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Colleges</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-500">
          <Plus size={16} /> Add College
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center gap-2">
        <Search size={16} className="text-slate-400" />
        <input type="text" placeholder="Search colleges..." value={search} onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm flex-1" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-600">College</th>
              <th className="text-left p-3 font-semibold text-slate-600">Status</th>
              <th className="text-left p-3 font-semibold text-slate-600">Drives</th>
              <th className="text-left p-3 font-semibold text-slate-600">Students</th>
              <th className="text-left p-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <Building2 size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.subdomain}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>{c.status || 'active'}</span>
                </td>
                <td className="p-3 text-slate-600">{c.driveCount || 0}</td>
                <td className="p-3 text-slate-600">{c.studentCount || 0}</td>
                <td className="p-3">
                  <button onClick={() => navigate(`/platform/colleges/${c._id}`)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">View</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">No colleges found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add College</h3>
            <div className="space-y-3">
              <input placeholder="College Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="Subdomain (e.g. rvce)" value={form.subdomain} onChange={e => setForm({ ...form, subdomain: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="Admin Name" value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <input placeholder="Admin Email" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <input type="password" placeholder="Admin Password" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleAdd} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
