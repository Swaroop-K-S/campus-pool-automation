import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, Search, X, Grid as GridIcon, List as ListIcon, MapPin, DollarSign, Calendar, GraduationCap, MoreVertical, Pencil, Copy, Play, CalendarCheck, CheckCircle, Trash2, Link, Tag, QrCode, Building, Activity, TrendingUp, Users, Bell, Clock, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useRef } from 'react';
import { DriveCalendar } from '../../components/admin/DriveCalendar';



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
    locations: drive.locations, eligibility: drive.eligibility || { minCGPA: 6.5, branches: ['CSE', 'ISE', 'ECE', 'ME', 'CV', 'EEE'] }, eventDate: drive.eventDate,
    tags: drive.tags || []
  });
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(tagInput.trim())) {
        setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm({ ...form, tags: form.tags.filter((t: string) => t !== tagToRemove) });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Drive Tags / Categories</label>
            <div className="p-2 border border-slate-200 rounded-xl bg-white min-h-[50px] flex flex-wrap gap-2 items-center focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50">
              {form.tags.map((tag: string) => (
                <span key={tag} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                  {tag} <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12}/></button>
                </span>
              ))}
              <input 
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={form.tags.length === 0 ? "Type a tag (e.g. Dream, Phase-1) and press Enter" : "Add another tag"}
                className="flex-1 min-w-[120px] outline-none text-sm px-2 py-1 bg-transparent"
              />
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
  

  const [drives, setDrives] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [collegeDetails, setCollegeDetails] = useState<any>({});
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  
  const [showSelectedDrawer, setShowSelectedDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid'|'list'|'calendar'>((localStorage.getItem('dashboardView') as 'grid'|'list'|'calendar') || 'grid');
  const [tagFilter, setTagFilter] = useState('All');

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
      const [drivesRes, selectedRes, profileRes, activityRes] = await Promise.all([
        api.get('/drives?includeCount=true').catch(() => null),
        api.get('/analytics/selected-students').catch(() => null),
        api.get('/college/profile').catch(() => null),
        api.get('/analytics/recent-activity').catch(() => null)
      ]);

      if ((drivesRes as any)?.success) setDrives((drivesRes as any).data);
      if ((selectedRes as any)?.success) setSelectedStudents((selectedRes as any).data);
      if ((profileRes as any)?.success) setCollegeDetails((profileRes as any).data);
      if ((activityRes as any)?.success) setRecentActivities((activityRes as any).data);
      
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
      const matchTag = tagFilter === 'All' ? true : (d.tags || []).includes(tagFilter);
      return matchSearch && matchStatus && matchTag;
    });
  }, [drives, searchQuery, statusFilter, tagFilter]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    drives.forEach(d => (d.tags || []).forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }, [drives]);

  const { totalPipeline, activeEvents, totalShortlisted } = useMemo(() => {
    let pipeline = 0, active = 0, shortlisted = 0;
    drives.forEach(d => {
      pipeline += (d.applicationCount || 0);
      shortlisted += (d.shortlistedCount || 0);
      if (d.status === 'active' || d.status === 'event_day') active++;
    });
    return { totalPipeline: pipeline, activeEvents: active, totalShortlisted: shortlisted };
  }, [drives]);
  
  const placementRate = totalPipeline > 0 ? Math.round((totalShortlisted / totalPipeline) * 100) : 0;

  // Helper to format relative time
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="page-enter p-4 md:p-8 max-w-[1600px] mx-auto min-h-full font-sans">
      
      {/* ULTRA-PREMIUM HERO SECTION */}
      <div className="relative mb-16">
        { /* Animated Mesh Background */ }
        <div className="absolute inset-0 bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4"></div>
          <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="relative z-10 px-10 pt-12 pb-24 md:pb-28">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div>
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md mb-4">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
                 <span className="text-white/90 text-xs font-bold tracking-wider uppercase">System Operational</span>
               </div>
               <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-2">
                 Welcome back, {collegeDetails?.name?.split(' ')[0] || 'Admin'}
               </h1>
               <p className="text-white/70 text-base md:text-lg max-w-2xl">
                 Here's the pulse of <span className="text-white font-bold">{collegeDetails?.name || 'your campus'}</span> today. Track {totalPipeline} candidates across {activeEvents} active placement drives.
               </p>
             </div>
             
             <button onClick={() => navigate('/admin/drives/new')}
               className="shrink-0 bg-white hover:bg-indigo-50 active:scale-95 transition-all text-indigo-900 px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-black/20 group">
               <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300 text-indigo-600"/> Create New Drive
             </button>
           </div>
        </div>

        {/* FLOATING PULSE METRICS */}
        <div className="absolute bottom-0 left-10 right-10 translate-y-1/2 z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-white flex items-center gap-5 hover:-translate-y-1 transition-transform cursor-default group">
              <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Users className="text-indigo-600" size={24}/>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Total Pipeline</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-800 leading-none">{totalPipeline}</h3>
                  <span className="text-xs font-bold text-emerald-600 flex items-center">+12%</span>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-white flex items-center gap-5 hover:-translate-y-1 transition-transform cursor-default group">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Activity className="text-emerald-600" size={24}/>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Active Events</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-800 leading-none">{activeEvents}</h3>
                  <span className="text-xs font-medium text-slate-400">Live drives</span>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-white flex items-center gap-5 hover:-translate-y-1 transition-transform cursor-default group">
               <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUp className="text-blue-600" size={24}/>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">L1 Shortlist Rate</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-800 leading-none">{placementRate}%</h3>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* MACRO LAYOUT: DRIVES (75%) | LIVE FEED (25%) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 pt-8">
        
        {/* DRIVES SECTION */}
        <div className="xl:col-span-3 space-y-6">


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

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          {([['grid', GridIcon], ['list', ListIcon], ['calendar', Calendar]] as const).map(([mode, Icon]) => (
            <button key={mode} onClick={() => setViewMode(mode as 'grid' | 'list' | 'calendar')}
              title={`${mode} view`}
              className={`p-2 rounded-lg transition-all ${
                viewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <Icon size={16} />
            </button>
          ))}
        </div>

      </div>

      {/* TAG FILTER ROW */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Tag size={14} className="text-slate-400 shrink-0" />
          <button onClick={() => setTagFilter('All')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
              tagFilter === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}>All Tags</button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(tag)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                tagFilter === tag ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}>{tag}</button>
          ))}
        </div>
      )}

      {/* DRIVES RENDER */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 opacity-60">
           {[1,2,3,4].map(n => <div key={n} className="h-64 bg-slate-200 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : drives.length === 0 ? (
        <div className="text-center py-20 px-6 max-w-md mx-auto relative mt-8">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-[3rem] -z-10 blur-xl"></div>
          <div className="w-28 h-28 bg-white shadow-xl shadow-indigo-500/10 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8 relative border border-slate-100">
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping opacity-20"></div>
            <GraduationCap size={44} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">No placement drives yet</h2>
          <p className="text-slate-500 font-medium mb-10 text-sm leading-relaxed">Create your first placement drive to start collecting student applications, managing rounds, and tracking offers globally.</p>
          <button onClick={() => navigate('/admin/drives/new')} className="bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all w-full md:w-auto flex items-center justify-center gap-2 mx-auto">
            <Plus size={18}/> Create New Drive
          </button>
        </div>
      ) : filteredDrives.length === 0 ? (
        <div className="text-center py-16 text-slate-500 font-semibold border-2 border-slate-200/60 rounded-3xl bg-slate-50/50 border-dashed m-4 flex flex-col items-center justify-center">
           <Search size={32} className="text-slate-300 mb-3"/>
           <span className="text-slate-600">No drives match your filters.</span>
           <button onClick={() => { setStatusFilter('All'); setTagFilter('All'); setSearchQuery(''); }} className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-bold">Clear Filters</button>
        </div>
      ) : viewMode === 'calendar' ? (
        <DriveCalendar drives={filteredDrives} onDriveClick={(id) => navigate(`/admin/drives/${id}`)} />
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-3">
          {filteredDrives.map(drive => (
         <div key={drive._id} onClick={() => navigate(`/admin/drives/${drive._id}`)} 
              className={`relative bg-white rounded-2xl border p-4 flex items-center gap-4 hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer group
                ${ drive.status === 'event_day' ? 'border-emerald-400/70 shadow-[0_0_0_1px_rgba(52,211,153,0.3),0_8px_30px_rgba(52,211,153,0.15)] hover:shadow-[0_0_0_1px_rgba(52,211,153,0.5),0_12px_40px_rgba(52,211,153,0.25)]' :
                   drive.status === 'active' ? 'border-indigo-300/70 shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_8px_30px_rgba(99,102,241,0.10)] hover:shadow-[0_0_0_1px_rgba(99,102,241,0.4),0_12px_40px_rgba(99,102,241,0.18)]' :
                   drive.status === 'completed' ? 'border-slate-200/60 opacity-60 grayscale-[30%] hover:opacity-80 hover:shadow-sm' :
                   'border-slate-200/60 hover:border-indigo-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                }`}>
               <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-lg shrink-0">
                 {drive.companyName.substring(0, 2).toUpperCase()}
               </div>
               <div className="flex-1 min-w-0">
                 <h3 className="font-bold text-slate-800 truncate leading-tight">{drive.companyName}</h3>
                 <div className="flex items-center gap-2 mt-0.5">
                   <p className="text-slate-500 text-xs font-semibold truncate">{drive.jobRole}</p>
                   {drive.tags?.slice(0, 2).map((tag: string) => (
                     <span key={tag} className="bg-indigo-50/80 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">{tag}</span>
                   ))}
                   {drive.tags?.length > 2 && <span className="text-[10px] text-slate-400 font-bold">+{drive.tags.length - 2}</span>}
                 </div>
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
                 <div className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2 border shadow-sm ${
                    drive.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    drive.status === 'event_day' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    drive.status === 'draft' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                 }`}>
                   {(drive.status === 'active' || drive.status === 'event_day') && (
                     <span className="relative flex h-1.5 w-1.5">
                       <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${drive.status === 'active' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                       <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${drive.status === 'active' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                     </span>
                   )}
                   {drive.status === 'draft' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                   {drive.status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
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
        <div className="flex flex-col gap-5">
          {filteredDrives.map(drive => {
            const getStatusConfig = (status: string) => {
              switch(status) {
                case 'active': return { color: 'indigo', label: 'Active', pulse: true, gradient: 'from-indigo-500 via-indigo-600 to-blue-700' };
                case 'event_day': return { color: 'emerald', label: 'Live Event', pulse: true, gradient: 'from-emerald-500 via-teal-500 to-cyan-600' };
                case 'draft': return { color: 'slate', label: 'Draft', pulse: false, gradient: 'from-slate-300 via-slate-400 to-slate-500' };
                case 'completed': return { color: 'slate', label: 'Completed', pulse: false, gradient: 'from-slate-400 via-slate-500 to-slate-600' };
                default: return { color: 'slate', label: status, pulse: false, gradient: 'from-slate-300 to-slate-400' };
              }
            };
            const config = getStatusConfig(drive.status);

            return (
              <div key={drive._id} onClick={() => navigate(`/admin/drives/${drive._id}`)}
                className={`group relative bg-white rounded-2xl border shadow-sm hover:-translate-y-1 transition-all duration-500 cursor-pointer overflow-hidden
                  ${ drive.status === 'event_day' ? 'border-emerald-400/70 shadow-[0_0_0_1px_rgba(52,211,153,0.3),0_8px_30px_rgba(52,211,153,0.15)] hover:shadow-[0_0_0_1px_rgba(52,211,153,0.5),0_20px_60px_rgba(52,211,153,0.25)]' :
                     drive.status === 'active' ? 'border-indigo-300/60 shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_4px_20px_rgba(99,102,241,0.10)] hover:shadow-[0_0_0_1px_rgba(99,102,241,0.4),0_20px_60px_rgba(99,102,241,0.18)]' :
                     drive.status === 'completed' ? 'border-slate-200/60 opacity-60 grayscale-[40%] hover:opacity-80 hover:shadow-md hover:grayscale-0 hover:border-slate-300' :
                     'border-slate-200/60 hover:shadow-2xl hover:shadow-indigo-500/10'
                  }`}>
                
                <div className="flex h-full">
                  {/* Left Gradient Accent Strip */}
                  <div className={`w-2 shrink-0 bg-gradient-to-b ${config.gradient} rounded-l-2xl`}></div>

                  {/* Main Card Body */}
                  <div className="flex-1 p-5">
                    {/* Row 1: Logo + Company Info + Status + Menu */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* Floating Logo */}
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.gradient} text-white font-black text-lg flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {drive.companyName.substring(0, 2).toUpperCase()}
                      </div>

                      {/* Company & Role */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-slate-800 text-lg leading-tight truncate group-hover:text-indigo-600 transition-colors">{drive.companyName}</h3>
                        <p className="text-slate-500 text-sm font-semibold truncate flex items-center gap-1.5 mt-0.5">
                          <GraduationCap size={13} className="text-indigo-400 shrink-0"/>
                          {drive.jobRole}
                        </p>
                      </div>

                      {/* Status Pill */}
                      <span className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 border bg-white shadow-sm text-${config.color}-700 border-${config.color}-200/50`}>
                        {config.pulse && (
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-${config.color}-500`}></span>
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 bg-${config.color}-500`}></span>
                          </span>
                        )}
                        {!config.pulse && <span className={`w-1.5 h-1.5 rounded-full bg-${config.color}-400 shrink-0`} />}
                        {config.label}
                      </span>

                      <div onClick={e => e.stopPropagation()} className="shrink-0">
                        <DriveOptionsMenu drive={drive} onEdit={handleEditDrive} onDelete={handleDeleteDrive} onDuplicate={handleDuplicateDrive} onChangeStatus={handleChangeStatus} />
                      </div>
                    </div>

                    {/* Row 2: Pills */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {drive.ctc && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                          <DollarSign size={12} className="text-emerald-500"/> {drive.ctc} LPA
                        </span>
                      )}
                      {drive.locations?.[0] && (
                        <span className="bg-slate-50 text-slate-600 border border-slate-200/60 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                          <MapPin size={12} className="text-slate-400"/> {drive.locations[0]} {drive.locations.length > 1 && `+${drive.locations.length-1}`}
                        </span>
                      )}
                      {drive.tags?.[0] && (
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/50 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                          <Tag size={10} className="text-indigo-400"/> {drive.tags[0]}
                        </span>
                      )}
                      {drive.driveDate && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200/50 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                          <Calendar size={12} className="text-amber-500"/> {new Date(drive.driveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    
                    {/* Row 3: Metrics + Quick Actions — all inline */}
                    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100">
                      {/* Metrics */}
                      <div className="flex items-center gap-4 mr-auto">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Users size={16} className="text-indigo-500"/>
                          </div>
                          <div>
                            <div className="font-black text-slate-800 text-base leading-none">{drive.applicationCount || 0}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applied</div>
                          </div>
                        </div>
                        <div className="w-px h-8 bg-slate-100"/>
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <CheckCircle size={16} className="text-emerald-500"/>
                          </div>
                          <div>
                            <div className="font-black text-slate-800 text-base leading-none">{drive.shortlistedCount || 0}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shortlisted</div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/event/${drive._id}/qr-display`); }}
                          className="group/btn flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all text-xs font-bold"
                          title="Show QR Code"
                        >
                          <QrCode size={14} className="group-hover/btn:scale-110 transition-transform"/>
                          QR
                        </button>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/drives/${drive._id}/room-assignment`); }}
                          className="group/btn flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all text-xs font-bold"
                          title="Room Management"
                        >
                          <Building size={14} className="group-hover/btn:scale-110 transition-transform"/>
                          Rooms
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (drive.formToken) {
                              navigator.clipboard.writeText(`${window.location.origin}/apply/${drive.formToken}`);
                              toast.success('Form link copied!');
                            } else {
                              toast.error('No public form available');
                            }
                          }}
                          className="group/btn w-9 h-9 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg transition-all"
                          title="Copy Public Link"
                        >
                          <Link size={14} className="group-hover/btn:-rotate-45 transition-transform"/>
                        </button>

                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/drives/${drive._id}`); }}
                          className="group/btn flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-indigo-600 text-white rounded-lg transition-all text-xs font-bold"
                        >
                          Open <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform"/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div> {/* END DRIVES SECTION (xl:col-span-3) */}

      {/* LIVE ACTIVITY SIDEBAR */}
      <div className="hidden xl:block xl:col-span-1">
         <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sticky top-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                 <Bell size={20} className="text-indigo-600"/>
                 Live Activity
              </h3>
              <span className="relative flex h-2.5 w-2.5">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
               {recentActivities.length === 0 && (
                 <div className="pl-6 text-xs text-slate-400 font-medium py-4">No recent activity yet.</div>
               )}
               {recentActivities.map((activity, i) => (
                 <div key={i} className="relative pl-6">
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      activity.color === 'amber' ? 'bg-amber-400' :
                      activity.color === 'emerald' ? 'bg-emerald-400' :
                      activity.color === 'indigo' ? 'bg-indigo-400' : 'bg-slate-400'
                    }`}></div>
                    <div className="bg-slate-50 hover:bg-indigo-50/50 transition-colors p-3 rounded-xl border border-slate-100/50 -mt-1.5">
                      <p className="text-xs font-bold text-slate-700 leading-snug mb-1">{activity.message}</p>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                         <Clock size={10}/> {timeAgo(activity.timestamp)}
                      </div>
                    </div>
                 </div>
               ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
               <button onClick={() => navigate('/admin/analytics')} className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                  View Full Analytics <ChevronRight size={16}/>
               </button>
            </div>
         </div>
      </div>

    </div> {/* END MACRO LAYOUT GRID */}

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
