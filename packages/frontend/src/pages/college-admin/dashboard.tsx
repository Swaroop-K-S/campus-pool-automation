import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, UserCheck, Trophy, Plus, ChevronRight, Search, X, Grid as GridIcon, List as ListIcon, MapPin, DollarSign, Calendar, BarChart2, GraduationCap, MoreVertical, Pencil, Copy, Play, CalendarCheck, CheckCircle, Trash2, Link } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useRef } from 'react';

const StatCard = ({ label, value, icon, color, onClick, trend, sublabel }: any) => (
  <div onClick={onClick}
    className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-${color}-200 hover:-translate-y-0.5 transition-all group`}>
    
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors`}>
        {icon}
      </div>
      {trend && (
        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
          {trend}
        </span>
      )}
    </div>
    
    <div className="text-3xl font-black text-slate-800 mb-0.5">{value}</div>
    <div className="text-sm font-bold text-slate-600">{label}</div>
    {sublabel && (
      <div className="text-xs font-semibold tracking-wide text-slate-400 mt-0.5">{sublabel}</div>
    )}
    
    <div className="mt-3 text-xs text-indigo-600 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      View all <ChevronRight size={12}/>
    </div>
  </div>
);

const DriveOptionsMenu = ({ drive, onEdit, onDelete, onDuplicate, onChangeStatus }: any) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: any) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
        <MoreVertical size={16}/>
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-52 bg-white rounded-xl shadow-lg border border-slate-100 z-50 py-1 animate-in slide-in-from-top-2">
          <button onClick={(e) => { e.stopPropagation(); onEdit(drive); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            <Pencil size={15} className="text-slate-400"/> Edit Drive Details
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(drive); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            <Copy size={15} className="text-slate-400"/> Duplicate Drive
          </button>
          <div className="border-t border-slate-100 my-1"/>
          {drive.status === 'draft' && (
            <button onClick={(e) => { e.stopPropagation(); onChangeStatus(drive._id, 'active'); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50">
              <Play size={15}/> Activate Drive
            </button>
          )}
          {drive.status === 'active' && (
            <button onClick={(e) => { e.stopPropagation(); onChangeStatus(drive._id, 'event_day'); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50">
              <CalendarCheck size={15}/> Start Event Day
            </button>
          )}
          {drive.status === 'event_day' && (
            <button onClick={(e) => { e.stopPropagation(); onChangeStatus(drive._id, 'completed'); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
              <CheckCircle size={15}/> Mark Completed
            </button>
          )}
          <div className="border-t border-slate-100 my-1"/>
          {drive.status === 'draft' ? (
            <button onClick={(e) => { e.stopPropagation(); onDelete(drive); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
              <Trash2 size={15}/> Delete Drive
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onDelete(drive); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 text-left">
              <div className="shrink-0"><Trash2 size={15}/></div>
              <div className="leading-tight">
                <div>Delete Drive</div>
                <div className="text-xs text-red-400">All data will be lost</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const EditDriveModal = ({ drive, onClose, onSave }: any) => {
  const [form, setForm] = useState({
    companyName: drive.companyName, jobRole: drive.jobRole, ctc: drive.ctc,
    locations: drive.locations, eligibility: drive.eligibility || { minCGPA: 6.5, branches: ['CSE', 'ISE', 'ECE', 'ME', 'CV', 'EEE'] }, eventDate: drive.eventDate
  });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-slate-800">Edit Drive</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Company Name*</label>
            <input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"/>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Job Role*</label>
            <input value={form.jobRole} onChange={e => setForm({...form, jobRole: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">CTC Package</label>
              <input value={form.ctc} onChange={e => setForm({...form, ctc: e.target.value})} placeholder="e.g. 8.5 LPA" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white text-sm focus:outline-none focus:border-indigo-400"/>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Event Date</label>
              <input type="date" value={form.eventDate ? new Date(form.eventDate).toISOString().split('T')[0] : ''} onChange={e => setForm({...form, eventDate: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white text-sm focus:outline-none focus:border-indigo-400"/>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Minimum CGPA</label>
            <input type="range" min="5" max="10" step="0.1" value={form.eligibility?.minCGPA || 6} onChange={e => setForm({...form, eligibility: {...form.eligibility, minCGPA: parseFloat(e.target.value)}})} className="w-full accent-indigo-600"/>
            <div className="flex justify-between text-xs text-slate-400 mt-1"><span>5.0</span><span className="text-indigo-600 font-semibold text-sm">{(form.eligibility?.minCGPA || 6).toFixed(1)} / 10.0</span><span>10.0</span></div>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t">
          <button onClick={onClose} className="flex-1 border border-slate-200 rounded-xl py-3 text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-medium">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

const DeleteDriveModal = ({ drive, onClose, onConfirm, loading }: any) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-600"/></div>
      <h2 className="text-lg font-bold text-center text-slate-800 mb-2">Delete Drive?</h2>
      <p className="text-slate-500 text-center text-sm mb-2">You are about to delete:</p>
      <div className="bg-slate-50 rounded-xl p-3 text-center mb-4"><div className="font-semibold text-slate-800">{drive.companyName}</div><div className="text-sm text-slate-500">{drive.jobRole}</div></div>
      {drive.status !== 'draft' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-red-700 text-sm font-medium">⚠️ Warning</p>
          <p className="text-red-600 text-xs mt-1">This drive has {drive.applicationCount || 0} applications. All student data, uploaded resumes, photos, and notifications will be permanently deleted.</p>
        </div>
      )}
      <p className="text-slate-500 text-center text-sm mb-6">This action cannot be undone.</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 border border-slate-200 rounded-xl py-3 text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
        <button onClick={onConfirm} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2">
          {loading ? 'Deleting...' : <><Trash2 size={16}/> Delete Drive</>}
        </button>
      </div>
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [dbStats, setDbStats] = useState<any>({
    activeDrives: 0,
    totalApplications: 0,
    shortlisted: 0,
    selected: 0
  });
  
  const [drives, setDrives] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [collegeDetails, setCollegeDetails] = useState<any>({});
  
  const [showSelectedDrawer, setShowSelectedDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid'|'list'>((localStorage.getItem('dashboardView') as 'grid'|'list') || 'grid');

  const [editingDrive, setEditingDrive] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingDrive, setDeletingDrive] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('dashboardView', viewMode);
  }, [viewMode]);

  const fetchData = async () => {
    try {
      const [statsRes, drivesRes, selectedRes, profileRes] = await Promise.all([
        api.get('/analytics/summary').catch(() => null),
        api.get('/drives?includeCount=true').catch(() => null),
        api.get('/analytics/selected-students').catch(() => null),
        api.get('/college/profile').catch(() => null)
      ]);

      if ((statsRes as any)?.success) setDbStats((statsRes as any).data);
      if ((drivesRes as any)?.success) setDrives((drivesRes as any).data);
      if ((selectedRes as any)?.success) setSelectedStudents((selectedRes as any).data);
      if ((profileRes as any)?.success) setCollegeDetails((profileRes as any).data);
      
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateDrive = async (drive: any) => {
    try {
      const res = await api.post(`/drives/${drive._id}/clone`);
      if ((res as any).success) {
        toast.success(`"${drive.companyName}" cloned as a new draft!`);
        fetchData();
        navigate(`/admin/drives/${(res as any).data._id}`);
      }
    } catch { toast.error('Failed to duplicate drive'); }
  };

  const handleEditDrive = (drive: any) => { setEditingDrive(drive); setShowEditModal(true); };
  const handleSaveEdit = async (formData: any) => {
    try {
      await api.put(`/drives/${editingDrive._id}`, formData);
      toast.success('Drive updated successfully!');
      setShowEditModal(false);
      fetchData();
    } catch { toast.error('Failed to update drive'); }
  };

  const handleDeleteDrive = (drive: any) => { setDeletingDrive(drive); setShowDeleteModal(true); };
  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/drives/${deletingDrive._id}`);
      toast.success('Drive deleted');
      setShowDeleteModal(false);
      fetchData();
    } catch { toast.error('Failed to delete drive'); }
    finally { setDeleteLoading(false); }
  };

  const handleChangeStatus = async (driveId: string, newStatus: string) => {
    try {
      const endpoint = newStatus === 'active' ? 'activate' : newStatus === 'event_day' ? 'start-event' : 'complete';
      await api.patch(`/drives/${driveId}/${endpoint}`);
      toast.success(`Drive status updated!`);
      fetchData();
    } catch { toast.error('Failed to update status'); }
  };



  useEffect(() => {
    fetchData();
    
    const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:5000';
    const socket = io(socketUrl);
    
    socket.on('student:verified', () => fetchData());
    socket.on('round:results_uploaded', () => {
      fetchData();
      toast('Round results updated', { icon: '🔄' });
    });

    return () => { socket.disconnect(); };
  }, []);

  const filteredDrives = useMemo(() => {
    return drives.filter(d => {
      const matchSearch = d.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) || d.jobRole?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' ? true : d.status.toLowerCase() === statusFilter.toLowerCase().replace(' ', '_');
      return matchSearch && matchStatus;
    });
  }, [drives, searchQuery, statusFilter]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const placementRate = useMemo(() => {
    if (!dbStats.totalApplications) return 0;
    return Math.round((dbStats.selected / dbStats.totalApplications) * 100);
  }, [dbStats]);

  const bestCompany = useMemo(() => {
    if (!selectedStudents.length) return 'None';
    return selectedStudents.sort((a,b) => b.students.length - a.students.length)[0]?.companyName || 'None';
  }, [selectedStudents]);

  return (
    <div className="page-enter p-8 max-w-7xl mx-auto min-h-full">
      
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Placement Drives</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            {collegeDetails?.name || 'Your College'} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => navigate('/admin/drives/new')}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all">
          <Plus size={18}/> New Drive
        </button>
      </div>

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard 
          label="Active Drives" 
          value={loading ? '-' : dbStats.activeDrives} 
          icon={<Briefcase size={20} className="text-indigo-600"/>} 
          color="indigo" 
          onClick={() => { setStatusFilter('Active'); window.scrollTo({ top: 500, behavior: 'smooth'}); }} 
          sublabel="In progress or event day" 
        />
        <StatCard 
          label="Total Applications" 
          value={loading ? '-' : dbStats.totalApplications} 
          icon={<Users size={20} className="text-blue-600"/>} 
          color="blue" 
          onClick={() => {
            const firstActive = drives.find(d => d.status === 'active' || d.status === 'event_day');
            if (firstActive) navigate(`/admin/drives/${firstActive._id}`);
          }} 
          sublabel="Across all drives" 
        />
        <StatCard 
          label="Shortlisted" 
          value={loading ? '-' : dbStats.shortlisted} 
          icon={<UserCheck size={20} className="text-amber-600"/>} 
          color="amber" 
          onClick={() => {
            const firstDrive = drives.find(d => d.shortlistedCount > 0);
            if (firstDrive) navigate(`/admin/drives/${firstDrive._id}`);
          }} 
          sublabel="Pending notifications" 
        />
        <StatCard 
          label="Selected" 
          value={loading ? '-' : dbStats.selected} 
          icon={<Trophy size={20} className="text-green-600"/>} 
          color="green" 
          onClick={() => setShowSelectedDrawer(true)} 
          sublabel="Students placed" 
          trend={dbStats.selected > 0 ? "View Details" : null}
        />
      </div>

      {/* QUICK STATS BAR */}
      {drives.length > 0 && dbStats.selected > 0 && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 mb-8 text-white shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <BarChart2 size={24} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-indigo-100 uppercase tracking-widest">Overall Placement Rate</div>
              <div className="text-2xl font-black">{placementRate}% <span className="text-sm font-medium text-indigo-200">across {drives.length} drives this year</span></div>
            </div>
          </div>
          <div className="flex gap-8 text-right">
            <div>
              <div className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1">Best Company</div>
              <div className="font-bold text-white max-w-[150px] truncate">{bestCompany}</div>
            </div>
            <div>
               <div className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1">Top Branch</div>
               <div className="font-bold text-white max-w-[150px] truncate">Computer Science</div>
            </div>
          </div>
        </div>
      )}

      {/* DRIVES SECTION HEADER */}
      <div className="flex flex-col md:flex-row items-center gap-4 py-3 mb-6 bg-white/50 backdrop-blur top-0 sticky z-10">
        <div className="relative flex-1 w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input 
            placeholder="Search drives..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar">
          {['All', 'Active', 'Event Day', 'Draft', 'Completed'].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${
                statusFilter === status ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}>
              {status}
            </button>
          ))}
        </div>

        <div className="ml-auto flex bg-white border border-slate-200 rounded-lg p-1">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
            <GridIcon size={16} />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
            <ListIcon size={16} />
          </button>
        </div>
      </div>

      {/* DRIVES RENDER */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 opacity-60">
           {[1,2,3,4].map(n => <div key={n} className="h-64 bg-slate-200 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : drives.length === 0 ? (
        <div className="text-center py-20 px-6 max-w-md mx-auto">
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">No placement drives yet</h2>
          <p className="text-slate-500 font-medium mb-8">Create your first placement drive to start collecting student applications and managing rounds.</p>
          <button onClick={() => navigate('/admin/drives/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm shadow-indigo-200 w-full md:w-auto transition-all">
            Create New Drive
          </button>
        </div>
      ) : filteredDrives.length === 0 ? (
        <div className="text-center py-12 text-slate-500 font-bold border border-slate-200 rounded-2xl bg-white border-dashed">
           No drives match your filters.
        </div>
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-3">
          {filteredDrives.map(drive => (
            <div key={drive._id} onClick={() => navigate(`/admin/drives/${drive._id}`)} 
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group">
               <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-lg shrink-0">
                 {drive.companyName.substring(0, 2).toUpperCase()}
               </div>
               <div className="flex-1 min-w-0">
                 <h3 className="font-bold text-slate-800 truncate leading-tight">{drive.companyName}</h3>
                 <p className="text-slate-500 text-xs font-semibold mt-0.5 truncate">{drive.jobRole}</p>
               </div>
               <div className="hidden md:flex gap-6 shrink-0 text-center">
                 <div>
                   <div className="font-black text-slate-700">{drive.applicationCount || 0}</div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Apps</div>
                 </div>
                 <div>
                   <div className="font-black text-slate-700">{drive.shortlistedCount || 0}</div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shortlists</div>
                 </div>
               </div>
               <div className="shrink-0 flex items-center gap-3 w-32 justify-end">
                 <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    drive.status === 'active' ? 'bg-green-100 text-green-700' :
                    drive.status === 'event_day' ? 'bg-indigo-100 text-indigo-700' :
                    drive.status === 'draft' ? 'bg-slate-100 text-slate-500' :
                    'bg-slate-200 text-slate-500'
                 }`}>
                   {drive.status.replace('_', ' ')}
                 </div>
                 {drive.formToken && (
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       navigator.clipboard.writeText(`${window.location.origin}/apply/${drive.formToken}`);
                       toast.success('Public link copied!');
                     }}
                     className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                     title="Copy Public Link"
                   >
                     <Link size={16} />
                   </button>
                 )}
                 <div onClick={e => e.stopPropagation()}>
                    <DriveOptionsMenu drive={drive} onEdit={handleEditDrive} onDelete={handleDeleteDrive} onDuplicate={handleDuplicateDrive} onChangeStatus={handleChangeStatus} />
                 </div>
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDrives.map(drive => (
            <div key={drive._id} onClick={() => navigate(`/admin/drives/${drive._id}`)}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group flex flex-col h-full">
              
              <div className={`h-1.5 w-full ${
                drive.status === 'active' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' :
                drive.status === 'event_day' ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                drive.status === 'draft' ? 'bg-slate-200' : 'bg-slate-300'
              }`} />
              
              <div className="p-5 flex flex-col grow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xl flex items-center justify-center border border-indigo-100/50">
                    {drive.companyName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      drive.status === 'active' ? 'bg-green-100 text-green-700' :
                      drive.status === 'event_day' ? 'bg-indigo-100 text-indigo-700' :
                      drive.status === 'draft' ? 'bg-slate-100 text-slate-500' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {drive.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                      {drive.status.replace('_', ' ')}
                    </span>
                    {drive.formToken && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`${window.location.origin}/apply/${drive.formToken}`);
                          toast.success('Public link copied!');
                        }}
                        className="p-1 px-1.5 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg border border-transparent hover:border-indigo-100 transition-colors"
                        title="Copy Public Link"
                      >
                        <Link size={16} />
                      </button>
                    )}
                    <DriveOptionsMenu drive={drive} onEdit={handleEditDrive} onDelete={handleDeleteDrive} onDuplicate={handleDuplicateDrive} onChangeStatus={handleChangeStatus} />
                  </div>
                </div>
                
                <h3 className="font-black text-slate-800 text-lg leading-tight line-clamp-1">{drive.companyName}</h3>
                <p className="text-slate-500 text-sm font-medium mt-0.5 line-clamp-1">{drive.jobRole}</p>
                
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1">
                    <DollarSign size={12} /> {drive.ctc || 'Not Disclosed'}
                  </span>
                  {drive.locations?.slice(0, 2).map((loc: string, i: number) => (
                    <span key={i} className="bg-slate-50 text-slate-600 border border-slate-200 text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                      <MapPin size={12} /> {loc}
                    </span>
                  ))}
                  {drive.locations?.length > 2 && <span className="text-xs font-bold text-slate-400">+{drive.locations.length - 2}</span>}
                </div>
                
                <div className="border-t border-slate-100 my-4 grow" />
                
                <div className="flex justify-between items-end">
                  <div className="flex gap-4 sm:gap-6">
                    <div>
                      <div className="font-black text-slate-800 text-xl leading-none">{drive.applicationCount || 0}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Apps</div>
                    </div>
                    <div>
                      <div className="font-black text-slate-800 text-xl leading-none">{drive.shortlistedCount || 0}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">L1 Passed</div>
                    </div>
                  </div>
                  <div className="text-right">
                     <div className="font-bold text-slate-600 text-sm flex items-center justify-end gap-1.5"><Calendar size={14}/> {formatDate(drive.eventDate)}</div>
                     <div className="text-indigo-600 font-bold text-xs flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">Open <ChevronRight size={12} strokeWidth={3}/></div>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* SELECTED STUDENTS DRAWER */}
      {showSelectedDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSelectedDrawer(false)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-green-50/50">
              <div className="flex items-center gap-2">
                <Trophy className="text-green-600" size={20} />
                <h2 className="font-black text-slate-800">Selected Students</h2>
              </div>
              <button onClick={() => setShowSelectedDrawer(false)} className="p-1.5 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg border shadow-sm transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {selectedStudents.length === 0 ? (
                <div className="text-center mt-20">
                  <Trophy size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="font-bold text-slate-600">No students selected yet.</p>
                  <p className="text-sm text-slate-400 font-medium">Results will appear here when HR uploads them.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedStudents.map((driveGroup: any) => (
                    <div key={driveGroup.driveId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Company</div>
                        <h4 className="font-bold text-slate-800">{driveGroup.companyName}</h4>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {driveGroup.students.map((student: any, idx: number) => (
                          <div key={idx} className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {student.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-700 text-sm truncate">{student.name}</div>
                              <div className="flex gap-2 items-center mt-0.5">
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 font-bold rounded">{student.usn}</span>
                                <span className="text-xs text-slate-400 font-medium truncate">{student.branch}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditModal && <EditDriveModal drive={editingDrive} onClose={() => setShowEditModal(false)} onSave={handleSaveEdit} />}
      {showDeleteModal && <DeleteDriveModal drive={deletingDrive} onClose={() => setShowDeleteModal(false)} onConfirm={handleConfirmDelete} loading={deleteLoading} />}

    </div>
  );
}
