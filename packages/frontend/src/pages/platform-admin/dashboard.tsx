import { useState, useEffect } from 'react';
import { Building, GraduationCap, Briefcase, Plus, Users, X, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export default function PlatformDashboardPage() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', address: '', adminEmail: '' });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const res = await api.get('/platform/colleges');
      if ((res as any).success) {
        setColleges((res as any).data);
      }
    } catch (err) {
      toast.error('Failed to fetch colleges');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(pwd);
  };

  const openModal = () => {
    generatePassword();
    setFormData({ name: '', address: '', adminEmail: '' });
    setIsModalOpen(true);
    setShowPwd(true);
  };

  const handleAddCollege = async (e: any) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const loadingToast = toast.loading('Creating college and generating VAPID keys...');
      const payload = { ...formData, adminPassword: generatedPassword };
      const res = await api.post('/platform/colleges', payload);
      toast.dismiss(loadingToast);
      
      if ((res as any).success) {
        toast.success('College successfully enrolled');
        setIsModalOpen(false);
        fetchColleges();
      }
    } catch (err) {
      toast.error('Failed to create college');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Platform Overview</h1>
          <p className="text-slate-500 font-medium mt-1">Manage tenant colleges and observe global traffic.</p>
        </div>
        <button 
          onClick={openModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-all"
        >
          <Plus size={18} strokeWidth={3} /> Add College
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Building size={24} />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{loading ? '-' : colleges.length}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Colleges</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle size={24} /> 
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{loading ? '-' : colleges.filter(c => c.status === 'active').length}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Colleges</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">--</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Drives</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">--</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Students</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">College Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">Loading colleges...</td>
                </tr>
              ) : colleges.length > 0 ? (
                colleges.map(college => (
                  <tr key={college._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm shrink-0">
                          {college.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{college.name}</p>
                          <p className="text-xs text-slate-500">{college._id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 text-sm">{college.address}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        college.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {college.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 text-sm">
                      {new Date(college.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-indigo-600 hover:underline text-sm font-bold mr-4">Edit</button>
                      <button className="text-slate-400 hover:text-slate-800 text-sm font-bold">Suspend</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No colleges found. Click "Add College" to onboard a new tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-h-screen animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-8">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800">Add New College</h3>
                <p className="text-sm font-medium text-slate-500">Create a new tenant workspace</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCollege} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">College Name *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none transition-shadow" placeholder="XYZ Institute of Technology" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Location/Address *</label>
                <input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none transition-shadow" placeholder="City, State" />
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-700 mb-4 sticky">Admin Account Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Admin Email *</label>
                    <input type="email" required value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none transition-shadow" placeholder="admin@college.edu" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Auto-Generated Password</label>
                    <div className="relative">
                      <input 
                        type={showPwd ? 'text' : 'password'} 
                        readOnly 
                        value={generatedPassword} 
                        className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-mono font-bold focus:outline-none" 
                      />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-800">
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs font-medium text-amber-600 mt-1.5 flex items-center gap-1">⚠️ Please copy this password now. It will not be shown again.</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Enroll College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// Temporary mock for icon
function CheckCircle(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
}
