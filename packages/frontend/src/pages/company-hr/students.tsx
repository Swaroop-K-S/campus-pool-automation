import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Search, Download } from 'lucide-react';

export default function HRStudents() {
  const user = useAuthStore(s => s.user);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const driveId = (user as any)?.driveId;

  useEffect(() => {
    document.title = 'Students — HR Portal';
    if (driveId) {
      api.get(`/drives/${driveId}/applications`).then((d: any) => {
        setStudents(d.data?.applications || d.data || []);
        setLoading(false);
      });
    }
  }, [driveId]);

  const filtered = students.filter(s => {
    const name = (s.data?.fullName || s.data?.name || '').toLowerCase();
    const usn = (s.data?.usn || '').toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || usn.includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/rounds/aptitude/export`, '_blank');
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading students...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Students</h1>
        <button onClick={handleExport} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-500">
          <Download size={16} /> Download List
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex gap-4 items-center">
        <div className="flex items-center gap-2 flex-1 bg-slate-50 rounded-lg px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input type="text" placeholder="Search by name or USN..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm flex-1" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="all">All Status</option>
          <option value="attended">Attended</option>
          <option value="selected">Selected</option>
          <option value="shortlisted">Shortlisted</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-600">Name</th>
              <th className="text-left p-3 font-semibold text-slate-600">USN</th>
              <th className="text-left p-3 font-semibold text-slate-600">Branch</th>
              <th className="text-left p-3 font-semibold text-slate-600">CGPA</th>
              <th className="text-left p-3 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="p-3 font-medium text-slate-800">{s.data?.fullName || s.data?.name || '-'}</td>
                <td className="p-3 text-slate-600">{s.data?.usn || '-'}</td>
                <td className="p-3 text-slate-600">{s.data?.branch || '-'}</td>
                <td className="p-3 text-slate-600">{s.data?.cgpa || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                    s.status === 'selected' ? 'bg-green-100 text-green-700' :
                    s.status === 'attended' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{s.status}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
