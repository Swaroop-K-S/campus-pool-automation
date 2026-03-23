import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ArrowLeft } from 'lucide-react';

export default function CollegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [college, setCollege] = useState<any>(null);
  const [drives, setDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'College Detail — Platform Admin';
    api.get(`/platform/colleges/${id}`).then((d: any) => {
      if (d.success) {
        setCollege(d.data?.college || d.data);
        setDrives(d.data?.drives || []);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/platform/colleges')}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-4">
        <ArrowLeft size={18} /> Back to Colleges
      </button>

      {/* College Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{college?.name || 'College'}</h1>
        <p className="text-slate-500 mt-1">{college?.subdomain}.campuspool.in</p>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">Status</div>
            <div className="font-bold text-slate-800">{college?.status || 'active'}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">Total Drives</div>
            <div className="font-bold text-slate-800">{drives.length}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">Admin</div>
            <div className="font-bold text-slate-800">{college?.admin?.name || college?.adminEmail || '-'}</div>
          </div>
        </div>
      </div>

      {/* Drives */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Drives ({drives.length})</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-600">Company</th>
              <th className="text-left p-3 font-semibold text-slate-600">Role</th>
              <th className="text-left p-3 font-semibold text-slate-600">Status</th>
              <th className="text-left p-3 font-semibold text-slate-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {drives.map((d: any) => (
              <tr key={d._id} className="border-b border-slate-50">
                <td className="p-3 font-medium text-slate-800">{d.companyName}</td>
                <td className="p-3 text-slate-600">{d.jobRole}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>{d.status}</span>
                </td>
                <td className="p-3 text-slate-500">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {drives.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">No drives for this college</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
