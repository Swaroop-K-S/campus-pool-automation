import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, AlignLeft, AlignJustify, Hash,
  ChevronDown, ChevronRight, Circle, CheckSquare, Calendar, FileText, 
  Image as ImageIcon, GripVertical, Trash2, Edit2, Copy, Lock, Plus, X, UploadCloud, MessageCircle, Mail,
  Presentation, PenTool, Code2, Users, Cpu, UserCheck, Download, Clock
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useSocket } from '../../hooks/use-socket';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const FIELD_TYPES = [
  { type: 'text', label: 'Text Field', icon: AlignLeft },
  { type: 'textarea', label: 'Textarea', icon: AlignJustify },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { type: 'radio', label: 'Radio Buttons', icon: Circle },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'file_pdf', label: 'PDF Upload', icon: FileText },
  { type: 'file_image', label: 'Image Upload', icon: ImageIcon },
];

const CountdownTimer = ({ closeDate }: { closeDate: string }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState('normal');

  useEffect(() => {
    if (!closeDate) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(closeDate).getTime() - now;
      
      if (distance < 0) {
        setTimeLeft('Closed');
        clearInterval(interval);
        return;
      }
      
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      if (hours < 1 && days === 0) setUrgency('urgent');
      else if (hours < 24 && days === 0) setUrgency('warning');
      else setUrgency('normal');
    }, 1000);
    return () => clearInterval(interval);
  }, [closeDate]);

  if (!timeLeft) return null;

  return (
    <div className={`border rounded-xl p-3 flex w-full items-center gap-3 ${
      urgency === 'urgent' ? 'bg-red-50 border-red-200 text-red-700' :
      urgency === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
      'bg-green-50 border-green-200 text-green-700'
    }`}>
      <Clock size={16} />
      <span className="text-sm font-medium font-mono">Form closes in: {timeLeft}</span>
    </div>
  );
};

const DEFAULT_FIELDS = [
  { id: 'default_name', type: 'text', label: 'Full Name', required: true, locked: true },
  { id: 'default_usn', type: 'text', label: 'USN', required: true, locked: true },
  { id: 'default_branch', type: 'text', label: 'Branch', required: true, locked: true },
  { id: 'default_cgpa', type: 'number', label: 'CGPA', required: true, locked: true },
  { id: 'default_email', type: 'email', label: 'Email', required: true, locked: true },
  { id: 'default_phone', type: 'phone', label: 'Phone', required: true, locked: true },
];

const SortableFieldItem = ({ field, isActive, onSelect, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = FIELD_TYPES.find(t => t.type === field.type)?.icon || AlignLeft;

  return (
    <div 
      ref={setNodeRef} style={style} 
      onClick={() => onSelect(field)}
      className={`bg-white rounded-lg border-2 p-4 mb-3 flex items-center gap-4 cursor-default transition-colors ${isActive ? 'border-indigo-500 shadow-sm' : 'border-slate-200 hover:border-indigo-300'}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-700">
        <GripVertical size={20} />
      </div>
      <div className="flex-1 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600">
           <Icon size={16} />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">{field.label} {field.required && <span className="text-red-500">*</span>}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{field.type.replace('_', ' ')}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); onSelect(field); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg">
          <Edit2 size={16} />
        </button>
        {!field.locked && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(field.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default function DriveDetailPage() {
  const { driveId } = useParams();
  const [drive, setDrive] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  
  // Form Builder State
  const [fields, setFields] = useState<any[]>([...DEFAULT_FIELDS]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [formToken, setFormToken] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  // Form Validity State
  const [formOpenDate, setFormOpenDate] = useState<string>('');
  const [formCloseDate, setFormCloseDate] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('not_configured');
  const [formExtensions, setFormExtensions] = useState<any[]>([]);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [newCloseDate, setNewCloseDate] = useState<string>('');
  const [extendReason, setExtendReason] = useState<string>('');

  // Applications State
  const [applications, setApplications] = useState<any[]>([]);

  // Shortlist State
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [shortlistedStudents, setShortlistedStudents] = useState<any[]>([]);
  const [notifyChannels, setNotifyChannels] = useState<string[]>(['email', 'whatsapp']);
  const [notifyProgress, setNotifyProgress] = useState<{ sent: number, total: number } | null>(null);
  const [isUploadingShortlist, setIsUploadingShortlist] = useState(false);

  // Event Day State
  const [eventDate, setEventDate] = useState<string>('');
  const [hallName, setHallName] = useState<string>('');
  const [capacity, setCapacity] = useState<number>(0);
  const [reportTime, setReportTime] = useState<string>('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [showAddRoom, setShowAddRoom] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState({ name: '', floor: '', capacity: 0, panelists: '' });
  const [liveStats, setLiveStats] = useState({ invited: 0, checkedIn: 0, activeRound: '', roomsOpen: 0 });
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});
  const [newExpertiseTags, setNewExpertiseTags] = useState<string[]>([]);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [scheduleState, setScheduleState] = useState<Record<string, { startTime: string; duration: number }>>({});

  // Applications tab state
  const [appStatusFilter, setAppStatusFilter] = useState('all');

  const socket = useSocket();

  // Dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setIsUploadingShortlist(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post(`/drives/${driveId}/shortlist/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if ((res as any).success) {
          setUploadResult((res as any).data);
          fetchShortlisted();
          toast.success('Shortlist processed!');
        }
      } catch (err) {
        toast.error('Upload failed');
      } finally {
        setIsUploadingShortlist(false);
      }
    }
  });

  useEffect(() => {
    fetchDriveDetails();
    fetchFormConfig();
  }, [driveId]);

  useEffect(() => {
    if (activeTab === 'Applications') {
      fetchApplications();
    }
    if (activeTab === 'Shortlist') {
      fetchShortlisted();
    }
  }, [activeTab, driveId]);

  useEffect(() => {
    // Socket Connection
    socket.emit('join:drive', driveId);
    socket.on('notify:progress', (data: { sent: number, total: number }) => {
      setNotifyProgress(data);
      if (data.sent >= data.total) {
        toast.success('Notifications blast completed!');
        setTimeout(() => setNotifyProgress(null), 3000);
      }
    });
    socket.on('round:status_changed', (data: any) => {
      fetchDriveDetails();
      toast.success(`${data.roundType} is now ${data.status}!`);
    });
    socket.on('student:verified', (data: any) => {
      setLiveStats(prev => ({ ...prev, checkedIn: data.count }));
    });
    socket.on('event:stats', (data: any) => {
      setLiveStats(prev => ({ ...prev, ...data }));
    });
    return () => {
      socket.off('notify:progress');
      socket.off('round:status_changed');
      socket.off('student:verified');
      socket.off('event:stats');
    };
  }, [driveId]);

  const fetchDriveDetails = async () => {
    try {
      const res = await api.get(`/drives/${driveId}`);
      if ((res as any).success) {
        const d = (res as any).data;
        setDrive(d);
        if (d.formOpenDate) setFormOpenDate(new Date(d.formOpenDate).toISOString().slice(0, 16));
        if (d.formCloseDate) setFormCloseDate(new Date(d.formCloseDate).toISOString().slice(0, 16));
        setFormStatus(d.formStatus || 'not_configured');
        setFormExtensions(d.formExtensions || []);
      }
    } catch (err) {
      toast.error('Failed to fetch drive info');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormConfig = async () => {
    try {
      const res = await api.get(`/drives/${driveId}/form`);
      if ((res as any).data?.data && (res as any).data.length > 0) {
        setFields((res as any).data);
      }
      if (drive && drive.formToken) {
        setFormToken(drive.formToken);
      }
    } catch (err) {
      console.log('No existing form config found or error');
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await api.get(`/drives/${driveId}/applications`);
      if ((res as any).success) setApplications((res as any).data.applications || []);
    } catch (err) {
      toast.error('Failed to fetch applications');
    }
  };

  const fetchShortlisted = async () => {
    try {
      const res = await api.get(`/drives/${driveId}/shortlisted`);
      if ((res as any).success) setShortlistedStudents((res as any).data);
    } catch (err) { }
  };

  const handleNotifyMass = async () => {
    if (notifyChannels.length === 0) return toast.error('Select at least one channel');
    try {
      setNotifyProgress({ sent: 0, total: shortlistedStudents.length || 1 });
      await api.post(`/drives/${driveId}/notify/mass`, { channels: notifyChannels });
      toast.success('Pushing notifications background task...');
    } catch (err) {
      toast.error('Failed to trigger blast');
      setNotifyProgress(null);
    }
  };

  const fetchEventSetup = async () => {
    try {
      const res = await api.get(`/drives/${driveId}/event-setup`);
      if ((res as any).success) {
        const d = (res as any).data;
        if(d.eventDate) setEventDate(new Date(d.eventDate).toISOString().split('T')[0]);
        if(d.reportTime) setReportTime(d.reportTime);
        if(d.venueDetails) {
          setHallName(d.venueDetails.hallName || '');
          setCapacity(d.venueDetails.capacity || 0);
        }
        if (d.schedule) {
          const sMap: Record<string, {startTime: string; duration: number}> = {};
          d.schedule.forEach((s: any) => { sMap[s.roundType] = { startTime: s.startTime || '', duration: s.duration || 90 }; });
          setScheduleState(sMap);
        }
      }
    } catch {}
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get(`/drives/${driveId}/rooms`);
      if ((res as any).success) setRooms((res as any).data);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'Event Day') { fetchEventSetup(); fetchRooms(); }
  }, [activeTab, driveId]);

  const saveVenueDetails = async () => {
    try {
      await api.post(`/drives/${driveId}/event-setup`, { hallName, capacity, eventDate, reportTime });
      toast.success('Venue details saved!');
    } catch { toast.error('Failed to save venue'); }
  };

  const saveSchedule = async () => {
    try {
      const schedule = Object.entries(scheduleState).map(([roundType, v]) => ({
        roundType, startTime: v.startTime, duration: v.duration
      }));
      await api.post(`/drives/${driveId}/event-setup`, { hallName, capacity, eventDate, reportTime, schedule });
      toast.success('Schedule saved!');
    } catch { toast.error('Failed to save schedule'); }
  };

  const saveRoom = async (roundName: string) => {
    try {
      const panelists = newRoom.panelists
        ? newRoom.panelists.split(',').map(p => ({ name: p.trim(), expertise: [...newExpertiseTags] }))
        : [];
      const payload = { name: newRoom.name, floor: newRoom.floor, capacity: newRoom.capacity, round: roundName, panelists };
      const res = await api.post(`/drives/${driveId}/rooms`, payload);
      if((res as any).success) {
         setRooms([...rooms, (res as any).data]);
         setShowAddRoom(null);
         setNewRoom({ name: '', floor: '', capacity: 0, panelists: '' });
         setNewExpertiseTags([]);
         setExpertiseInput('');
         toast.success('Room added!');
      }
    } catch { toast.error('Failed to add room'); }
  };

  const deleteRoomById = async (roomId: string) => {
    if (!confirm('Delete this room?')) return;
    try {
      await api.delete(`/drives/${driveId}/rooms/${roomId}`);
      setRooms(rooms.filter(r => r._id !== roomId));
      toast.success('Room deleted');
    } catch { toast.error('Failed to delete room'); }
  };

  const activateRound = async (roundType: string) => {
    try {
      await api.put(`/drives/${driveId}/rounds/${roundType}/activate`);
      toast.success(`${roundType.replace('_',' ')} Round is now ACTIVE`);
      fetchDriveDetails();
    } catch { toast.error('Failed to activate round'); }
  };

  const completeRound = async (roundType: string) => {
    try {
      await api.put(`/drives/${driveId}/rounds/${roundType}/complete`);
      toast.success(`${roundType.replace('_',' ')} Round marked as done!`);
      fetchDriveDetails();
    } catch { toast.error('Failed to complete round'); }
  };

  const startEventDay = async () => {
    try {
      await api.patch(`/drives/${driveId}/start-event`);
      toast.success('Event Day started! QR system is now active');
      fetchDriveDetails();
    } catch { toast.error('Failed to start event'); }
  };

  const ROUND_ICONS: Record<string, any> = {
    ppt: Presentation, aptitude: PenTool, coding: Code2,
    gd: Users, technical_interview: Cpu, hr_interview: UserCheck
  };

  const toggleAccordion = (roundType: string) => {
    setExpandedRounds(prev => ({ ...prev, [roundType]: !prev[roundType] }));
  };

  const filteredApplications = appStatusFilter === 'all'
    ? applications
    : applications.filter(a => a.status === appStatusFilter);

  const Sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over?.id);
        
        // Prevent reordering above locked default fields securely if needed
        // For simplicity, we just array move. 
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addField = (type: string) => {
    const newField = {
      id: `field_${Date.now()}`,
      type,
      label: 'New Field',
      required: false,
      options: ['Option 1'],
      order: fields.length
    };
    setFields([...fields, newField]);
    setActiveFieldId(newField.id);
  };

  const updateActiveField = (updates: any) => {
    setFields(fields.map(f => f.id === activeFieldId ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (activeFieldId === id) setActiveFieldId(null);
  };

  const saveForm = async () => {
    try {
      setSavingForm(true);
      const res = await api.post(`/drives/${driveId}/form`, { fields });
      if ((res as any).success) {
        setFormToken((res as any).data.formToken);
        toast.success('Form saved! Public link is ready.');
        fetchDriveDetails(); // refresh to get formToken on drive obj
      }
    } catch (err) {
      toast.error('Failed to save form');
    } finally {
      setSavingForm(false);
    }
  };

  const scheduleForm = async () => {
    try {
      const res = await api.patch(`/drives/${driveId}/form/schedule`, { formOpenDate, formCloseDate });
      if ((res as any).success) {
        setFormStatus('open');
        fetchDriveDetails();
        toast.success(`Form correctly scheduled!`);
      }
    } catch (err) { toast.error('Failed to schedule form'); }
  };

  const extendForm = async () => {
    try {
      const res = await api.patch(`/drives/${driveId}/form/extend`, { newCloseDate, reason: extendReason });
      if ((res as any).success) {
        setFormStatus('extended');
        fetchDriveDetails();
        setShowExtendModal(false);
        setNewCloseDate('');
        setExtendReason('');
        toast.success('Form deadline extended!');
      }
    } catch (err) { toast.error('Failed to extend deadline'); }
  };

  const closeFormNow = async () => {
    if (!confirm('Are you sure you want to close this form? Students will not be able to submit after this.')) return;
    try {
      const res = await api.patch(`/drives/${driveId}/form/close`);
      if ((res as any).success) {
        setFormStatus('closed');
        fetchDriveDetails();
        toast.success('Form closed immediately!');
      }
    } catch (err) { toast.error('Failed to close form'); }
  };

  const reopenForm = async () => {
    try {
      const res = await api.patch(`/drives/${driveId}/form/reopen`, { newCloseDate });
      if ((res as any).success) {
        setFormStatus('open');
        fetchDriveDetails();
        setShowReopenModal(false);
        setNewCloseDate('');
        toast.success('Form reopened successfully!');
      }
    } catch (err) { toast.error('Failed to reopen form'); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading drive details...</div>;
  if (!drive) return <div className="p-8 text-center text-red-500 font-bold">Drive not found</div>;

  const activeField = fields.find(f => f.id === activeFieldId);

  return (
    <div className="flex flex-col h-full absolute inset-0 bg-slate-50">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
        <Link to="/admin/drives" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 mb-2 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Placement Drives
        </Link>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-slate-800">{drive.companyName}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
              ${drive.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {drive.status}
            </span>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-lg font-bold text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors">
              Download Applications
            </button>
            {drive.status === 'draft' && (
              <button className="px-4 py-2 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all">
                Activate Drive
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white border-b border-slate-200 px-8 flex gap-8 shrink-0">
        {['Overview', 'Form Builder', 'Applications', 'Shortlist', 'Event Day'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-4 font-bold text-sm border-b-2 transition-colors ${
              activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        
        {activeTab === 'Overview' && (
          <div className="p-8 overflow-y-auto h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">Drive Details</h3>
               <div className="space-y-3">
                 <p><span className="text-slate-500 font-semibold w-32 inline-block">Role:</span> <span className="font-bold text-slate-800">{drive.jobRole}</span></p>
                 <p><span className="text-slate-500 font-semibold w-32 inline-block">CTC:</span> <span className="font-bold text-slate-800">{drive.ctc}</span></p>
                 <p><span className="text-slate-500 font-semibold w-32 inline-block">Locations:</span> <span className="font-bold text-slate-800">{drive.locations?.join(', ') || 'N/A'}</span></p>
                 <p><span className="text-slate-500 font-semibold w-32 inline-block">Min CGPA:</span> <span className="font-bold text-slate-800">{drive.eligibility?.minCGPA || 'None'}</span></p>
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">Rounds</h3>
               <ol className="space-y-3">
                 {drive.rounds?.map((r: any, idx: number) => (
                   <li key={idx} className="flex items-center gap-3">
                     <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                     <span className="font-bold text-slate-700 flex-1">{r.type.replace('_', ' ').toUpperCase()}</span>
                     <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${r.status === 'pending' ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>{r.status}</span>
                   </li>
                 ))}
               </ol>
            </div>
          </div>
        )}

        {activeTab === 'Form Builder' && (
          <div className="flex h-full w-full bg-slate-50">
            {/* LEFT PANEL */}
            <div className="w-64 bg-white border-r border-slate-200 p-4 overflow-y-auto shrink-0 z-10">
              <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Default Fields</h3>
              <div className="mb-6 space-y-2">
                {DEFAULT_FIELDS.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-400 select-none">
                    <Lock size={16} /> <span className="font-bold text-sm">{f.label}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Field Types</h3>
              <div className="space-y-2">
                {FIELD_TYPES.map(type => (
                  <button 
                    key={type.type}
                    onClick={() => addField(type.type)}
                    className="w-full flex items-center gap-3 p-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-slate-700 transition-all text-left"
                  >
                    <type.icon size={18} className="text-indigo-500" />
                    <span className="font-bold text-sm">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CENTER PANEL */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto relative">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800">Form Preview</h2>
                <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
                  {fields.length} Fields
                </span>
              </div>

              {/* FORM VALIDITY PERIOD CARD */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800">Form Validity Period</h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    formStatus === 'not_configured' ? 'bg-slate-100 text-slate-600' :
                    formStatus === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    formStatus === 'open' ? 'bg-green-100 text-green-700 animate-pulse' :
                    formStatus === 'extended' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {formStatus === 'not_configured' ? 'Not Scheduled' :
                     formStatus === 'scheduled' ? '⏰ Scheduled' :
                     formStatus === 'open' ? '● Accepting' :
                     formStatus === 'extended' ? '↗ Extended' :
                     '✕ Closed'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Opens On</label>
                    <input type="datetime-local" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" 
                           value={formOpenDate} onChange={e => setFormOpenDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Closes On</label>
                    <input type="datetime-local" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" 
                           value={formCloseDate} onChange={e => setFormCloseDate(e.target.value)} />
                  </div>
                </div>

                <button onClick={scheduleForm} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm mb-4 transition-colors">
                  Set Schedule
                </button>

                {(formStatus === 'open' || formStatus === 'extended') && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setShowExtendModal(true)} className="flex-1 px-3 py-2 border border-amber-500 text-amber-600 hover:bg-amber-50 rounded-lg text-sm font-bold transition-colors">Extend Deadline</button>
                      <button onClick={closeFormNow} className="flex-1 px-3 py-2 border border-red-500 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors">Close Form Now</button>
                      <button onClick={() => setShowHistoryModal(true)} className="flex-1 px-3 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-bold transition-colors">View History</button>
                    </div>
                    {/* COUNTDOWN TIMER */}
                    <CountdownTimer closeDate={formCloseDate} />
                  </div>
                )}

                {formStatus === 'closed' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-3 flex justify-between items-center">
                    <span className="text-red-700 font-bold text-sm">✕ This form is currently closed</span>
                    <button onClick={() => setShowReopenModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors">Reopen Form</button>
                  </div>
                )}
              </div>

              <DndContext sensors={Sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="max-w-2xl mx-auto w-full space-y-1 pb-32">
                    {fields.map(field => (
                      <SortableFieldItem 
                        key={field.id} 
                        field={field} 
                        isActive={activeFieldId === field.id}
                        onSelect={(f: any) => setActiveFieldId(f.id)}
                        onDelete={deleteField}
                      />
                    ))}
                    
                    {fields.length === 0 && (
                      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500 font-bold">
                        Form is empty. Add fields from the left panel.
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>

              {/* URL BANNER */}
              {(formToken || drive.formToken) && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-2xl z-20">
                  <div className="bg-green-50 border border-green-300 rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-green-800 uppercase tracking-widest mb-1 flex items-center gap-1">🔗 Public Form Link</p>
                      <a href={`${window.location.origin}/apply/${formToken || drive.formToken}`} target="_blank" rel="noreferrer" className="text-green-700 font-medium text-sm hover:underline hover:text-green-800">
                        {`${window.location.origin}/apply/${formToken || drive.formToken}`}
                      </a>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/apply/${formToken || drive.formToken}`);
                        toast.success('Link copied to clipboard');
                      }}
                      className="p-2 bg-green-200 hover:bg-green-300 rounded-lg text-green-800 transition-colors"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL & SAVE BTN */}
            <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10 relative">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Field Settings</h3>
              </div>
              <div className="p-5 flex-1 overflow-y-auto">
                {!activeField ? (
                  <p className="text-slate-400 font-medium text-sm text-center mt-10">Click a field on the canvas to edit its properties.</p>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Field Label *</label>
                      <input 
                        type="text" value={activeField.label} disabled={activeField.locked}
                        onChange={e => updateActiveField({ label: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800 disabled:opacity-50"
                      />
                    </div>
                    
                    {!['file_pdf', 'file_image', 'checkbox', 'radio', 'dropdown'].includes(activeField.type) && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Placeholder</label>
                        <input 
                          type="text" value={activeField.placeholder || ''} disabled={activeField.locked}
                          onChange={e => updateActiveField({ placeholder: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800 disabled:opacity-50"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                       <input 
                         type="checkbox" id="req" checked={activeField.required} disabled={activeField.locked}
                         onChange={e => updateActiveField({ required: e.target.checked })}
                         className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-50"
                       />
                       <label htmlFor="req" className="text-sm font-bold text-slate-700 cursor-pointer">Required Field</label>
                    </div>

                    {['dropdown', 'radio', 'checkbox'].includes(activeField.type) && (
                      <div className="pt-4 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-3">Options</label>
                        <div className="space-y-2 mb-3">
                          {activeField.options?.map((opt: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <input 
                                value={opt} 
                                onChange={e => {
                                  const newOpts = [...(activeField.options || [])];
                                  newOpts[i] = e.target.value;
                                  updateActiveField({ options: newOpts });
                                }}
                                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                              <button onClick={() => {
                                const newOpts = [...(activeField.options || [])];
                                newOpts.splice(i, 1);
                                updateActiveField({ options: newOpts });
                              }} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded">
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => {
                          updateActiveField({ options: [...(activeField.options || []), `Option ${(activeField.options?.length||0)+1}`] })
                        }} className="text-indigo-600 font-bold text-xs flex items-center gap-1 hover:underline">
                          <Plus size={14} /> Add Option
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SAVE BUTTON */}
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                 <button 
                   onClick={saveForm}
                   disabled={savingForm}
                   className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-sm transition-colors text-sm"
                 >
                   {savingForm ? 'Saving...' : 'Save Form Changes'}
                 </button>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'Applications' && (
          <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Student Applications</h3>
              <button
                onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/export/applications`, '_blank')}
                className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-600 font-bold text-sm rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <Download size={16} /> Download XLSX
              </button>
            </div>

            {/* Status Filter Chips */}
            <div className="flex gap-2 mb-6">
              {['all', 'applied', 'shortlisted', 'attended', 'selected'].map(status => (
                <button
                  key={status}
                  onClick={() => setAppStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors border ${
                    appStatusFilter === status
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {filteredApplications.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-xl border border-slate-200 text-slate-500 font-bold">
                {applications.length === 0 ? 'No applications yet. Share the form link to start collecting!' : 'No applications match this filter.'}
              </div>
            ) : (
              <div className="bg-white border text-sm border-slate-200 rounded-xl overflow-hidden">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50 border-b border-slate-200">
                       <th className="px-5 py-3 font-bold text-slate-600">Photo</th>
                       <th className="px-5 py-3 font-bold text-slate-600">Candidate</th>
                       <th className="px-5 py-3 font-bold text-slate-600">USN & Branch</th>
                       <th className="px-5 py-3 font-bold text-slate-600">CGPA</th>
                       <th className="px-5 py-3 font-bold text-slate-600">Status</th>
                       <th className="px-5 py-3 font-bold text-slate-600">Resume</th>
                     </tr>
                   </thead>
                   <tbody>
                      {filteredApplications.map(app => {
                        const fullName = app.data?.fullName || app.data?.['Full Name'] || app.data?.['Name'] || 'N/A';
                        const usn = app.data?.usn || app.data?.['USN'] || app.data?.['Roll Number'] || 'N/A';
                        const branch = app.data?.branch || app.data?.['Branch'] || app.data?.['Department'] || 'N/A';
                        const cgpa = app.data?.cgpa || app.data?.['CGPA'] || 'N/A';
                        const initials = fullName !== 'N/A' ? fullName.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() : 'NA';
                        return (
                          <tr key={app._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="px-5 py-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black overflow-hidden">
                                <img
                                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/applications/${app._id}/photo`}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = initials; }}
                                />
                              </div>
                            </td>
                            <td className="px-5 py-3 font-bold text-slate-800">{fullName}</td>
                            <td className="px-5 py-3 font-medium text-slate-600">{usn} - {branch}</td>
                            <td className="px-5 py-3 font-bold text-slate-700">{cgpa}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                app.status === 'shortlisted' ? 'bg-green-100 text-green-700' :
                                app.status === 'selected' ? 'bg-emerald-100 text-emerald-700' :
                                app.status === 'attended' ? 'bg-blue-100 text-blue-700' :
                                'bg-indigo-100 text-indigo-700'
                              }`}>{app.status}</span>
                            </td>
                            <td className="px-5 py-3">
                              <a
                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/applications/${app._id}/resume`}
                                target="_blank" rel="noreferrer"
                                className="text-indigo-600 font-bold text-sm hover:underline"
                              >View Resume</a>
                            </td>
                          </tr>
                        );
                      })}
                   </tbody>
                 </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Shortlist' && (
          <div className="p-8 h-full overflow-y-auto w-full max-w-5xl mx-auto">
            {/* SECTION 1: Upload Shortlist */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Upload Shortlist</h3>
              <div 
                {...getRootProps()} 
                className={`bg-slate-50 border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50'}`}
              >
                <input {...getInputProps()} />
                <UploadCloud size={48} className="mx-auto text-indigo-400 mb-4" />
                <p className="font-bold text-slate-700 text-lg mb-1">
                  {isUploadingShortlist ? 'Uploading data...' : 'Drop shortlist XLSX/CSV here'}
                </p>
                <p className="text-sm font-medium text-slate-500">
                  Columns needed: Name, Email, USN, Phone
                </p>
              </div>

              {uploadResult && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5">
                  <p className="font-bold text-green-800 text-lg flex items-center gap-2 mb-2">✅ {uploadResult.matched} students matched and shortlisted</p>
                  {uploadResult.notFound > 0 && <p className="font-bold text-amber-700 flex items-center gap-2">⚠️ {uploadResult.notFound} rows not found in database</p>}
                  {uploadResult.errors?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200/50">
                      <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-2">Error Logs</p>
                      <ul className="text-sm text-green-700 space-y-1">
                        {uploadResult.errors.map((e: any, idx: number) => <li key={idx}>Row {e.row}: {e.reason}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: Shortlisted Students Table */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-lg font-bold text-slate-800">Shortlisted Students ({shortlistedStudents.length})</h3>
                
                <div className="flex items-center gap-4">
                   <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                     <input type="checkbox" checked={notifyChannels.includes('email')} onChange={(e) => setNotifyChannels(prev => e.target.checked ? [...prev, 'email'] : prev.filter(c => c !== 'email'))} className="w-4 h-4 text-indigo-600 rounded" />
                     <Mail size={16} /> Email
                   </label>
                   <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                     <input type="checkbox" checked={notifyChannels.includes('whatsapp')} onChange={(e) => setNotifyChannels(prev => e.target.checked ? [...prev, 'whatsapp'] : prev.filter(c => c !== 'whatsapp'))} className="w-4 h-4 text-green-600 rounded" />
                     <MessageCircle size={16} /> WhatsApp
                   </label>

                   <button onClick={handleNotifyMass} disabled={shortlistedStudents.length === 0 || notifyChannels.length === 0} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50">
                     Notify All
                   </button>
                </div>
              </div>

              {notifyProgress && (
                <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                   <div className="flex justify-between text-sm font-bold text-indigo-800 mb-2">
                     <span>Sending mass notifications...</span>
                     <span>{notifyProgress.sent} / {notifyProgress.total}</span>
                   </div>
                   <div className="w-full bg-indigo-200 rounded-full h-2.5">
                     <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(notifyProgress.sent / notifyProgress.total) * 100}%` }}></div>
                   </div>
                </div>
              )}

              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 border-b border-slate-200">
                       <th className="px-4 py-3 font-bold text-slate-600 text-sm">Candidate</th>
                       <th className="px-4 py-3 font-bold text-slate-600 text-sm">Email</th>
                       <th className="px-4 py-3 font-bold text-slate-600 text-sm">Phone</th>
                       <th className="px-4 py-3 font-bold text-slate-600 text-sm">Applied At</th>
                     </tr>
                   </thead>
                   <tbody>
                     {shortlistedStudents.map(app => (
                       <tr key={app._id} className="border-b border-slate-100 hover:bg-slate-50">
                         <td className="px-4 py-3 font-bold text-slate-800 text-sm">{app.data?.fullName || app.data?.name || 'N/A'}</td>
                         <td className="px-4 py-3 text-slate-600 text-sm">{app.data?.email || (app as any).candidateEmail || 'N/A'}</td>
                         <td className="px-4 py-3 text-slate-600 text-sm">{app.data?.phone || 'N/A'}</td>
                         <td className="px-4 py-3 text-slate-500 text-sm">{new Date(app.createdAt || Date.now()).toLocaleDateString()}</td>
                       </tr>
                     ))}
                     {shortlistedStudents.length === 0 && (
                       <tr><td colSpan={4} className="text-center py-8 text-slate-500 font-medium text-sm">No students shortlisted yet</td></tr>
                     )}
                   </tbody>
                 </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Event Day' && (
          <div className="p-8 h-full overflow-y-auto w-full max-w-5xl mx-auto space-y-6 pb-32">

            {/* ═══ SECTION 1: Venue Setup ═══ */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-5">Venue & Seminar Details</h3>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Seminar Hall Name</label>
                  <input type="text" value={hallName} onChange={e => setHallName(e.target.value)}
                    placeholder="Main Auditorium"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Hall Capacity</label>
                  <input type="number" value={capacity || ''} onChange={e => setCapacity(Number(e.target.value))}
                    placeholder="500"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Event Date</label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Report Time</label>
                  <input type="time" value={reportTime} onChange={e => setReportTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800" />
                </div>
              </div>
              <button onClick={saveVenueDetails}
                className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors">
                Save Venue Details
              </button>
            </div>

            {/* ═══ SECTION 2: Round Schedule ═══ */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5">
                <h3 className="text-lg font-semibold text-slate-800">Event Schedule</h3>
                <button onClick={saveSchedule}
                  className="px-4 py-2 border border-indigo-300 text-indigo-600 font-bold text-sm rounded-lg hover:bg-indigo-50 transition-colors">
                  Save Schedule
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {drive.rounds?.map((r: any) => {
                  const RoundIcon = ROUND_ICONS[r.type] || Circle;
                  const sched = scheduleState[r.type] || { startTime: '', duration: 90 };
                  return (
                    <div key={r.type} className="flex items-center gap-4 py-3">
                      {/* Left: icon + name */}
                      <div className="flex items-center gap-3 w-48">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <RoundIcon size={16} />
                        </div>
                        <span className="font-medium text-slate-800 text-sm">{r.type.replace('_', ' ').toUpperCase()}</span>
                      </div>

                      {/* Center: time + duration */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-1">
                          <Clock size={14} className="text-slate-400" />
                          <input type="time" value={sched.startTime}
                            onChange={e => setScheduleState(prev => ({ ...prev, [r.type]: { ...sched, startTime: e.target.value } }))}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div className="flex items-center gap-1">
                          <input type="number" placeholder="90" value={sched.duration || ''}
                            onChange={e => setScheduleState(prev => ({ ...prev, [r.type]: { ...sched, duration: Number(e.target.value) } }))}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-20 focus:ring-1 focus:ring-indigo-500 outline-none" />
                          <span className="text-slate-400 text-sm">mins</span>
                        </div>
                      </div>

                      {/* Right: status badge + action */}
                      <div className="flex items-center gap-2">
                        {r.status === 'pending' && (
                          <>
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">Pending</span>
                            <button onClick={() => activateRound(r.type)}
                              className="text-xs text-indigo-600 border border-indigo-300 rounded-lg px-3 py-1 hover:bg-indigo-50 ml-2 font-bold">
                              Activate
                            </button>
                          </>
                        )}
                        {r.status === 'active' && (
                          <>
                            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full animate-pulse flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Active
                            </span>
                            <button onClick={() => completeRound(r.type)}
                              className="text-xs text-green-600 border border-green-300 rounded-lg px-3 py-1 hover:bg-green-50 ml-2 font-bold">
                              Mark Done
                            </button>
                          </>
                        )}
                        {r.status === 'completed' && (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">✓ Done</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ═══ SECTION 3: Room Configuration (Accordion) ═══ */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-5">Room Configuration</h3>

              <div className="divide-y divide-slate-100">
                {drive.rounds?.map((r: any) => {
                  const RoundIcon = ROUND_ICONS[r.type] || Circle;
                  const isExpanded = expandedRounds[r.type] || false;
                  const roundRooms = rooms.filter(rm => rm.round === r.type);

                  return (
                    <div key={r.type}>
                      {/* Accordion Header */}
                      <div
                        onClick={() => toggleAccordion(r.type)}
                        className="flex justify-between items-center py-3 cursor-pointer hover:bg-slate-50 px-2 rounded transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <RoundIcon size={14} />
                          </div>
                          <span className="font-medium text-slate-800">{r.type.replace('_', ' ').toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{roundRooms.length} rooms</span>
                          {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="pt-4 pb-6 pl-4">
                          {/* Add Room Button */}
                          <button
                            onClick={() => setShowAddRoom(showAddRoom === r.type ? null : r.type)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-indigo-300 text-indigo-600 font-bold text-xs rounded-lg hover:bg-indigo-50 mb-4 transition-colors"
                          >
                            <Plus size={14} /> Add New Room
                          </button>

                          {/* Inline Add Room Form */}
                          {showAddRoom === r.type && (
                            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <input type="text" placeholder="Room A201" value={newRoom.name}
                                  onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-medium" />
                                <input type="text" placeholder="2nd Floor" value={newRoom.floor}
                                  onChange={e => setNewRoom({...newRoom, floor: e.target.value})}
                                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-medium" />
                                <input type="number" placeholder="30" value={newRoom.capacity || ''}
                                  onChange={e => setNewRoom({...newRoom, capacity: Number(e.target.value)})}
                                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-medium" />
                                <input type="text" placeholder="Panelist Name" value={newRoom.panelists}
                                  onChange={e => setNewRoom({...newRoom, panelists: e.target.value})}
                                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-medium" />
                              </div>

                              {/* Expertise Tags */}
                              <div className="mb-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Panelist Expertise Tags</label>
                                <input type="text" value={expertiseInput}
                                  onChange={e => setExpertiseInput(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && expertiseInput.trim()) {
                                      e.preventDefault();
                                      setNewExpertiseTags([...newExpertiseTags, expertiseInput.trim()]);
                                      setExpertiseInput('');
                                    }
                                  }}
                                  placeholder="e.g. Computer Science, AI/ML - press Enter"
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-medium" />
                                {newExpertiseTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {newExpertiseTags.map((tag, i) => (
                                      <span key={i} className="bg-indigo-100 text-indigo-700 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1">
                                        {tag}
                                        <button onClick={() => setNewExpertiseTags(newExpertiseTags.filter((_, idx) => idx !== i))} className="text-indigo-400 hover:text-indigo-700">
                                          <X size={12} />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 justify-end">
                                <button onClick={() => { setShowAddRoom(null); setNewRoom({name:'',floor:'',capacity:0,panelists:''}); setNewExpertiseTags([]); }}
                                  className="px-4 py-2 text-sm text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">
                                  Cancel
                                </button>
                                <button onClick={() => saveRoom(r.type)}
                                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">
                                  Save Room
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Existing Room Cards Grid */}
                          <div className="grid grid-cols-3 gap-3">
                            {roundRooms.map(rm => (
                              <div key={rm._id} className="bg-white border border-slate-200 rounded-xl p-4 relative group hover:border-indigo-300 transition-colors">
                                {/* Top row */}
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-semibold text-slate-800">{rm.name}</span>
                                  <div className="hidden group-hover:flex items-center gap-1">
                                    <button className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={13} /></button>
                                    <button onClick={() => deleteRoomById(rm._id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                                  </div>
                                </div>

                                {/* Floor */}
                                <span className="text-slate-400 text-xs">Floor: {rm.floor}</span>

                                {/* Capacity bar */}
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>Capacity</span>
                                    <span>{rm.assignedStudents?.length || 0} / {rm.capacity} seats</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full">
                                    <div className="h-1.5 bg-indigo-400 rounded-full transition-all"
                                      style={{width: `${Math.min(100, ((rm.assignedStudents?.length || 0) / rm.capacity) * 100)}%`}} />
                                  </div>
                                </div>

                                {/* Panelist chips */}
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {rm.panelists?.map((p: any, i: number) => (
                                    <span key={i} className="inline-flex items-center gap-1">
                                      <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full border border-indigo-200">{p.name}</span>
                                      {p.expertise?.length > 0 && (
                                        <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{p.expertise.join(', ')}</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {roundRooms.length === 0 && (
                              <p className="text-sm text-slate-400 italic p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center col-span-3">
                                No rooms configured for this round.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ═══ SECTION 4: Live Event Dashboard ═══ */}
            {drive.status === 'event_day' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                <h3 className="text-indigo-700 font-semibold text-lg flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" /> Live Event Dashboard
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 text-center border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Invited</p>
                    <p className="text-3xl font-black text-indigo-600">{liveStats.invited || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Checked In</p>
                    <p className="text-3xl font-black text-green-600">{liveStats.checkedIn || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Active Round</p>
                    <p className="text-lg font-bold text-indigo-700 mt-1">{liveStats.activeRound || 'PENDING'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Rooms Open</p>
                    <p className="text-3xl font-black text-amber-600">{liveStats.roomsOpen || rooms.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SECTION 5: QR Check-In Control (event_day only) ═══ */}
            {drive.status === 'event_day' && (
              <div className="bg-slate-900 rounded-2xl p-6 text-white">
                <h3 className="font-semibold text-lg mb-4">QR Check-In System</h3>
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={async () => {
                      try {
                        await api.post(`/event/${driveId}/qr/start`);
                        toast.success('QR rotation started!');
                      } catch { toast.error('Failed to start QR'); }
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-colors"
                  >
                    ▶ Start QR Rotation
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await api.post(`/event/${driveId}/qr/stop`);
                        toast.success('QR rotation stopped');
                      } catch { toast.error('Failed to stop QR'); }
                    }}
                    className="flex-1 bg-red-600/20 text-red-400 border border-red-600/30 font-bold py-2.5 rounded-xl hover:bg-red-600/30 transition-colors"
                  >
                    ⏹ Stop QR
                  </button>
                </div>
                <button
                  onClick={() => {
                    window.open(`/event/${driveId}/qr-display`, '_blank', 'width=1920,height=1080,fullscreen=yes');
                  }}
                  className="w-full bg-white text-slate-900 font-semibold py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Open QR Display Screen
                </button>
                <p className="text-slate-500 text-xs text-center mt-2">Opens fullscreen for projector display</p>
                <div className="mt-4 pt-4 border-t border-slate-700 text-center">
                  <span className="text-slate-400 text-sm">Students Checked In: </span>
                  <span className="text-green-400 font-black text-xl">{liveStats.checkedIn || 0}</span>
                </div>
              </div>
            )}

            {/* Start Event Day button (only when drive is 'active') */}
            {drive.status === 'active' && (
              <button onClick={startEventDay}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl text-base transition-colors shadow-md">
                🚀 Start Event Day
              </button>
            )}
          </div>
        )}

      </div>

      {/* EXTEND MODAL */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Extend Form Deadline</h3>
              <button onClick={() => setShowExtendModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Close Date *</label>
                  <input type="datetime-local" className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                         value={newCloseDate} onChange={e => setNewCloseDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason for Extension</label>
                  <textarea className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                            rows={3} placeholder="E.g., Requested by college placement cell"
                            value={extendReason} onChange={e => setExtendReason(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowExtendModal(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={extendForm} disabled={!newCloseDate} className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-50">Extend Deadline</button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN MODAL */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="font-bold text-lg text-indigo-900">Reopen Form</h3>
              <button onClick={() => setShowReopenModal(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-lg transition-colors border shadow-sm">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4 font-medium">Please set a new closing deadline to reopen this form for applications.</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Close Date *</label>
                <input type="datetime-local" className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                       value={newCloseDate} onChange={e => setNewCloseDate(e.target.value)} />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowReopenModal(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={reopenForm} disabled={!newCloseDate} className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-50">Reopen Form</button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Extension History</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {formExtensions.length === 0 ? (
                 <div className="text-center py-8">
                   <p className="text-slate-500 font-medium">No extensions have been made yet.</p>
                 </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {formExtensions.map((ext, idx) => (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <Calendar size={18} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-slate-900 text-sm">Extended By {ext.extendedBy}</div>
                          <time className="text-xs font-medium text-slate-500">{new Date(ext.extendedAt).toLocaleDateString()}</time>
                        </div>
                        <div className="text-slate-500 text-xs mb-2 italic">"{ext.reason}"</div>
                        <div className="flex items-center gap-2 text-xs font-bold mt-2 pt-2 border-t">
                           <span className="text-slate-400 line-through">{ext.previousCloseDate ? new Date(ext.previousCloseDate).toLocaleString() : 'N/A'}</span>
                           <span className="text-indigo-400">→</span>
                           <span className="text-indigo-600">{new Date(ext.newCloseDate).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
