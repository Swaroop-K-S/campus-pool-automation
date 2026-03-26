import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, AlignLeft, AlignJustify, Hash,
  ChevronDown, ChevronRight, Circle, CheckSquare, Calendar, FileText, 
  Image as ImageIcon, GripVertical, Trash2, Edit2, Copy, Lock, Plus, X, UploadCloud, Mail,
  Presentation, PenTool, Code2, Users, Cpu, UserCheck, Download, Clock, Check, Search,
  Send, Loader2, Info, MessageSquare
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useSocket } from '../../hooks/use-socket';
import { DownloadButton } from '../../components/shared/DownloadButton';
import { useAuthStore } from '../../store/auth.store';
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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [newCloseDate, setNewCloseDate] = useState<string>('');
  const [extendReason, setExtendReason] = useState<string>('');

  // Applications State
  const [applications, setApplications] = useState<any[]>([]);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [appTotal, setAppTotal] = useState(0);
  const [appLoading, setAppLoading] = useState(true);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // Shortlist State
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [shortlistedStudents, setShortlistedStudents] = useState<any[]>([]);
  const [isUploadingShortlist, setIsUploadingShortlist] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectAllShortlist, setSelectAllShortlist] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [sendChannel, setSendChannel] = useState<'email'|'whatsapp'|'both'>('both');
  const [emailSubject, setEmailSubject] = useState('Invitation: {{companyName}} Campus Drive — {{eventDate}}');
  const [emailTemplate, setEmailTemplate] = useState(`<p>Dear {{name}},</p>\n<p>Congratulations! You have been shortlisted for the <strong>{{companyName}}</strong> campus placement drive.</p>\n<table style="border-collapse:collapse;margin:16px 0;"><tr><td style="padding:6px 12px;font-weight:bold;">Company</td><td style="padding:6px 12px;">{{companyName}}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Role</td><td style="padding:6px 12px;">{{jobRole}}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">CTC</td><td style="padding:6px 12px;">{{ctc}}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Date</td><td style="padding:6px 12px;">{{eventDate}}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Venue</td><td style="padding:6px 12px;">{{venueName}}</td></tr></table>\n<p><strong>Your Drive ID: {{driveId}}</strong><br/>Keep this ID safe. You will need it on event day.</p>\n<p>Please carry your college ID and updated resume.</p>\n<p>Best regards,<br/>{{collegeName}}</p>`);
  const [whatsappTemplate, setWhatsappTemplate] = useState(`Hi {{name}}! 🎉\n\nYou have been *shortlisted* for the *{{companyName}}* campus placement drive.\n\n📋 *Details:*\n- Role: {{jobRole}}\n- CTC: {{ctc}}\n- Date: {{eventDate}}\n- Venue: {{venueName}}\n\n🪪 *Your Drive ID: {{driveId}}*\nSave this ID — you will need it on event day to scan QR and check in.\n\nPlease carry your college ID and resume.\n\n- {{collegeName}}`);
  const [sendProgress, setSendProgress] = useState<{sent:number;total:number;failed:number;active:boolean}|null>(null);

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

  // Column picker state
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnsInitialized, setColumnsInitialized] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('all');
  const [downloadLoading, setDownloadLoading] = useState(false);

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

  // Auto-select all columns when form fields first load
  useEffect(() => {
    if (formFields.length > 0 && !columnsInitialized) {
      const fixed = ['driveStudentId', 'referenceNumber', 'status', 'submittedAt'];
      const dynamic = formFields
        .filter((f: any) => f.type !== 'file_pdf' && f.type !== 'file_image')
        .map((f: any) => f.id);
      setSelectedColumns([...fixed, ...dynamic]);
      setColumnsInitialized(true);
    }
  }, [formFields, columnsInitialized]);

  useEffect(() => {
    if (activeTab === 'Applications') {
      fetchApplications();
    }
    if (activeTab === 'Shortlist') {
      fetchShortlisted();
    }
  }, [activeTab, driveId, appStatusFilter]);

  useEffect(() => {
    // Socket Connection
    socket.emit('join:drive', driveId);
    socket.on('notify:progress', (data: any) => {
      if (data.done) {
        toast.success('Notifications completed!');
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
    setAppLoading(true);
    try {
      const res = await api.get(`/drives/${driveId}/applications?status=${appStatusFilter}`);
      if ((res as any).success) {
        setApplications((res as any).data.applications || []);
        setFormFields((res as any).data.formFields || []);
        setAppTotal((res as any).data.total || 0);
      }
    } catch (err) {
      toast.error('Failed to fetch applications');
    } finally {
      setAppLoading(false);
    }
  };

  const fetchShortlisted = async () => {
    try {
      const res = await api.get(`/drives/${driveId}/shortlisted`);
      if ((res as any).success) setShortlistedStudents((res as any).data);
    } catch (err) { }
  };



  // ── Smart messaging helpers ─────────────────
  // Smart field lookup: try field ID from formFields first, then common key names
  const getFieldFromFormFields = (labelMatch: string, data: Record<string, any>): string | null => {
    if (!data) return null;
    const match = formFields.find((f: any) => f.label?.toLowerCase().includes(labelMatch));
    if (match && data[match.id] !== undefined && data[match.id] !== '') {
      return Array.isArray(data[match.id]) ? data[match.id].join(', ') : String(data[match.id]);
    }
    return null;
  };

  const getStudentName = (s: any) => {
    const d = s.data || {};
    // Try field ID from formFields first
    const fromField = getFieldFromFormFields('name', d);
    if (fromField && !fromField.toLowerCase().includes('company')) return fromField;
    // Fallback to key-name search
    const nk = Object.keys(d).find(k => k.toLowerCase() === 'fullname') || Object.keys(d).find(k => k.toLowerCase() === 'full_name') || Object.keys(d).find(k => k.toLowerCase() === 'name') || Object.keys(d).find(k => k.toLowerCase().includes('name') && !k.toLowerCase().includes('email'));
    return (nk ? d[nk] : null) || d.name || d.Name || d.full_name || 'Unknown';
  };
  const getStudentEmail = (s: any) => { const d = s.data || {}; const f = getFieldFromFormFields('email', d); if (f) return f; return d.email || d.Email || d.email_id || Object.values(d).find(v => typeof v === 'string' && String(v).includes('@')) || (s as any).candidateEmail || ''; };
  const getStudentPhone = (s: any) => { const d = s.data || {}; const f = getFieldFromFormFields('phone', d) || getFieldFromFormFields('mobile', d); if (f) return f; return d.phone || d.Phone || d.mobile || d.contact || ''; };
  const getStudentUSN = (s: any) => { const d = s.data || {}; const f = getFieldFromFormFields('usn', d) || getFieldFromFormFields('roll', d); if (f) return f; return d.usn || d.USN || d.roll_no || '—'; };
  const getStudentBranch = (s: any) => { const d = s.data || {}; const f = getFieldFromFormFields('branch', d) || getFieldFromFormFields('department', d); if (f) return f; return d.branch || d.Branch || '—'; };
  const getStudentCGPA = (s: any) => { const d = s.data || {}; const f = getFieldFromFormFields('cgpa', d) || getFieldFromFormFields('gpa', d); if (f) return f; return String(d.cgpa || d.CGPA || '—'); };

  const toggleStudentSelect = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const resolvePreview = (template: string, student: any): string => {
    if (!student) return template;
    const vars: Record<string, string> = {
      name: getStudentName(student), usn: getStudentUSN(student), branch: getStudentBranch(student),
      cgpa: getStudentCGPA(student), email: String(getStudentEmail(student)), phone: String(getStudentPhone(student)),
      driveId: student.driveStudentId || '—', referenceNumber: student.referenceNumber || '—',
      companyName: drive?.companyName || '—', jobRole: drive?.jobRole || '—', ctc: drive?.ctc || '—',
      eventDate: drive?.eventDate ? new Date(drive.eventDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'TBA',
      venueName: (drive as any)?.venueDetails?.hallName || 'TBA', collegeName: 'Your College',
    };
    let result = template;
    Object.entries(vars).forEach(([k, v]) => { result = result.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'gi'), v); });
    return result;
  };

  const buildQuickEmailBody = (student: any) => {
    const name = getStudentName(student);
    const did = student.driveStudentId || '';
    return `Dear ${name},\n\nYou have been shortlisted for the ${drive?.companyName} campus placement drive.\n\nYour Drive ID: ${did}\n\nPlease save this ID for event day check-in.\n\nBest regards`;
  };

  const AVAILABLE_VARS = [
    { key: 'name', label: 'Student Name' }, { key: 'usn', label: 'USN' }, { key: 'branch', label: 'Branch' },
    { key: 'cgpa', label: 'CGPA' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
    { key: 'driveId', label: 'Drive ID' }, { key: 'companyName', label: 'Company' }, { key: 'jobRole', label: 'Job Role' },
    { key: 'ctc', label: 'CTC' }, { key: 'eventDate', label: 'Event Date' }, { key: 'venueName', label: 'Venue' },
    { key: 'collegeName', label: 'College Name' },
  ];

  const handleTemplateSend = async () => {
    const ids = selectedStudentIds.size > 0 ? [...selectedStudentIds] : [];
    const total = ids.length > 0 ? ids.length : shortlistedStudents.length;
    setSendProgress({ sent: 0, total, failed: 0, active: true });

    socket.on('notify:progress', ({ sent, total: t, failed, done }: any) => {
      setSendProgress({ sent, total: t, failed, active: !done });
      if (done) {
        socket.off('notify:progress');
        toast.success(`Sent ${sent} messages!` + (failed > 0 ? ` (${failed} failed)` : ''));
      }
    });

    try {
      await api.post(`/drives/${driveId}/notify/bulk`, {
        applicationIds: ids, channel: sendChannel, emailSubject, emailTemplate, whatsappTemplate
      });
    } catch {
      toast.error('Failed to start sending');
      setSendProgress(null);
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
    try {
      const res = await api.patch(`/drives/${driveId}/form/close`);
      if ((res as any).success) {
        setFormStatus('closed');
        fetchDriveDetails();
        setShowCloseConfirm(false);
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
        <Link to="/admin/dashboard" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 mb-2 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
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
          <div className="p-8 overflow-y-auto h-full flex flex-col gap-6">
            
            {/* STATUS STEPPER */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest mb-6">Drive Status Progression</h3>
              <div className="flex items-center justify-between relative mt-2 md:px-12">
                <div className="absolute left-12 right-12 top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-10 rounded-full" />
                {['draft', 'active', 'event_day', 'completed'].map((s, idx, arr) => {
                  const isActive = drive.status === s;
                  const isPast = arr.indexOf(drive.status) > idx;
                  const canClick = arr.indexOf(drive.status) === idx - 1;
                  
                  return (
                    <div key={s} className="flex flex-col items-center gap-3 bg-white px-4">
                      <button 
                        disabled={!canClick}
                        onClick={async () => {
                          if (canClick) {
                            try {
                              if (s === 'active') await api.patch(`/drives/${drive._id}/activate`);
                              else await api.put(`/drives/${drive._id}`, { status: s });
                              fetchDriveDetails();
                              toast.success(`Drive moved to ${s.replace('_', ' ')}!`);
                            } catch (e) { toast.error('Failed to update status'); }
                          }
                        }}
                        title={canClick ? `Click to move to ${s.replace('_', ' ')}` : ''}
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all shadow-sm ${
                          isActive ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 scale-110' :
                          isPast ? 'bg-indigo-600 border-indigo-600 text-white' :
                          canClick ? 'bg-white border-indigo-400 text-indigo-600 hover:bg-indigo-50 cursor-pointer hover:scale-105' :
                          'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isPast ? <Check size={20} /> : idx + 1}
                      </button>
                      <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-indigo-700' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                        {s.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                 <div className="flex items-center justify-between mb-4 border-b pb-2">
                   <h3 className="font-bold text-lg text-slate-800">Drive Rounds</h3>
                 </div>
                 <div className="space-y-2">
                   {drive.rounds?.map((r: any, idx: number) => (
                     <div key={idx} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                       <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${r.status === 'completed' ? 'bg-green-500 text-white' : r.status === 'active' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                         {r.status === 'completed' ? '✓' : (r.order || idx + 1)}
                       </div>
                       <span className="text-sm text-slate-700 flex-1 font-medium">{r.label || r.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                       {r.isCustom && <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-medium">Custom</span>}
                       <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'completed' ? 'bg-green-100 text-green-700' : r.status === 'active' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                         {r.status === 'completed' ? 'Done' : r.status === 'active' ? '● Active' : 'Pending'}
                       </span>
                     </div>
                   ))}
                 </div>
              </div>
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
                      <button onClick={() => setShowCloseConfirm(true)} className="flex-1 px-3 py-2 border border-red-500 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors">Close Form Now</button>
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

        {activeTab === 'Applications' && (() => {
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

          // Build dynamic table columns from formFields (or fallback from raw data keys)
          const tableFields = (() => {
            const priority = ['usn', 'branch', 'cgpa', 'email', 'phone'];
            
            if (formFields.length > 0) {
              const sorted = [...formFields]
                .filter((f: any) => f.type !== 'file_pdf' && f.type !== 'file_image')
                .sort((a: any, b: any) => {
                  const aKey = a.label.toLowerCase().replace(/\s+/g, '');
                  const bKey = b.label.toLowerCase().replace(/\s+/g, '');
                  const ai = priority.indexOf(aKey);
                  const bi = priority.indexOf(bKey);
                  if (ai === -1 && bi === -1) return (a.order || 0) - (b.order || 0);
                  if (ai === -1) return 1;
                  if (bi === -1) return -1;
                  return ai - bi;
                });
              return sorted.slice(0, 5);
            }
            
            // Fallback: extract keys from the first application's data
            const firstApp = applications[0];
            if (!firstApp?.data) return [];
            const skipKeys = ['name', 'fullName', 'full_name', 'Full Name', 'Name'];
            const rawKeys = Object.keys(firstApp.data)
              .filter(k => {
                if (skipKeys.includes(k)) return false;
                const val = firstApp.data[k];
                // Skip non-displayable values (files, objects, arrays)
                return typeof val === 'string' || typeof val === 'number';
              });
            
            // Sort by priority
            const sorted = rawKeys.sort((a, b) => {
              const ai = priority.indexOf(a.toLowerCase().replace(/[\s_]/g, ''));
              const bi = priority.indexOf(b.toLowerCase().replace(/[\s_]/g, ''));
              if (ai === -1 && bi === -1) return 0;
              if (ai === -1) return 1;
              if (bi === -1) return -1;
              return ai - bi;
            });
            
            return sorted.slice(0, 5).map((key, i) => ({
              id: key,
              label: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              type: typeof firstApp.data[key] === 'number' ? 'number' : 'text',
              order: i,
            }));
          })();

          // Safe string conversion for display
          const safeStr = (val: any): string => {
            if (val === null || val === undefined) return '—';
            if (typeof val === 'string') return val;
            if (typeof val === 'number') return String(val);
            if (Array.isArray(val)) return val.filter(v => typeof v === 'string' || typeof v === 'number').join(', ');
            return '—';
          };

          // Client-side search filter
          const displayApps = appSearchQuery
            ? applications.filter((app: any) => {
                const q = appSearchQuery.toLowerCase();
                const data = app.data || {};
                return Object.values(data).some(v => {
                  const s = safeStr(v);
                  return s !== '—' && s.toLowerCase().includes(q);
                });
              })
            : applications;

          // Helper to get field value from app.data (smart lookup)
          const getFieldValue = (app: any, field: any) => {
            const appData = app.data;
            if (!appData) return '—';
            
            // 1. Try exact field ID first (most reliable — UUIDs as keys)
            if (appData[field.id] !== undefined && appData[field.id] !== '') {
              return safeStr(appData[field.id]);
            }
            
            // 2. Common field shortcuts
            const label = (field.label || '').toLowerCase();
            if (label.includes('name') && !label.includes('company')) {
              const v = appData.name || appData.Name || appData.full_name || appData.fullName || appData['Full Name'] || appData.student_name;
              if (v) return safeStr(v);
            }
            if (label.includes('usn') || label.includes('roll') || label.includes('reg')) {
              const v = appData.usn || appData.USN || appData.roll_no || appData.rollno || appData.reg_no;
              if (v) return safeStr(v);
            }
            if (label.includes('email')) {
              const v = appData.email || appData.Email || appData.email_id;
              if (v) return safeStr(v);
            }
            if (label.includes('phone') || label.includes('mobile') || label.includes('contact')) {
              const v = appData.phone || appData.Phone || appData.mobile || appData.contact;
              if (v) return safeStr(v);
            }
            if (label.includes('cgpa') || label.includes('gpa')) {
              const v = appData.cgpa || appData.CGPA || appData.gpa;
              if (v) return safeStr(v);
            }
            if (label.includes('branch') || label.includes('department')) {
              const v = appData.branch || appData.Branch || appData.department || appData.dept;
              if (v) return safeStr(v);
            }
            
            // 3. Try label-based keys
            const keys = [
              field.label,
              field.label?.toLowerCase(),
              field.label?.toLowerCase().replace(/\s+/g, '_'),
              field.label?.toLowerCase().replace(/\s+/g, ''),
            ];
            for (const key of keys) {
              if (key && appData[key] !== undefined && appData[key] !== '') {
                return safeStr(appData[key]);
              }
            }
            
            // 4. Fuzzy match on key
            const labelWords = (field.label || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
            if (labelWords.length > 0) {
              for (const [key, val] of Object.entries(appData)) {
                if (!val) continue;
                if (labelWords.every((w: string) => key.toLowerCase().includes(w))) {
                  return safeStr(val);
                }
              }
            }
            
            return '—';
          };

          return (
          <div className="p-8 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-800">Student Applications</h3>
                <span className="bg-slate-100 text-slate-600 text-sm px-2.5 py-1 rounded-full font-medium">{appTotal}</span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowColumnPicker(!showColumnPicker)}
                  className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                  <Download size={15}/>
                  Download XLSX
                  <ChevronDown size={13} className={`transition-transform ${showColumnPicker ? 'rotate-180' : ''}`}/>
                </button>

                {/* Close overlay */}
                {showColumnPicker && (
                  <div className="fixed inset-0 z-40" onClick={() => setShowColumnPicker(false)}/>
                )}

                {/* Column Picker Popover */}
                {showColumnPicker && (() => {
                  const fixedColumns = [
                    { id: 'driveStudentId', label: 'Drive ID' },
                    { id: 'referenceNumber', label: 'Reference Number' },
                    { id: 'status', label: 'Status' },
                    { id: 'submittedAt', label: 'Submitted Date' },
                  ];
                  const formColumns = formFields
                    .filter((f: any) => f.type !== 'file_pdf' && f.type !== 'file_image')
                    .map((f: any) => ({ id: f.id, label: f.label, type: f.type }));
                  const allCols = [...fixedColumns, ...formColumns];
                  const toggleCol = (id: string) => setSelectedColumns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
                  const selectAll = () => setSelectedColumns(allCols.map(c => c.id));
                  const selectNone = () => setSelectedColumns([]);

                  return (
                    <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50">
                      {/* Header */}
                      <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <div>
                          <h3 className="font-semibold text-slate-800 text-sm">Choose Columns to Export</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{selectedColumns.length} of {allCols.length} selected</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={selectAll} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">All</button>
                          <span className="text-slate-300">|</span>
                          <button onClick={selectNone} className="text-xs text-slate-500 hover:text-slate-700 font-medium">None</button>
                        </div>
                      </div>

                      {/* Column list */}
                      <div className="max-h-72 overflow-y-auto p-2">
                        {/* System columns */}
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">System Fields</p>
                          {fixedColumns.map(col => (
                            <label key={col.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer group">
                              <div
                                onClick={() => toggleCol(col.id)}
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${selectedColumns.includes(col.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                                {selectedColumns.includes(col.id) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                              </div>
                              <span className="text-sm text-slate-700 flex-1">{col.label}</span>
                              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">system</span>
                            </label>
                          ))}
                        </div>

                        {/* Form fields */}
                        {formColumns.length > 0 && (
                          <div className="px-2 py-1.5 border-t border-slate-100 mt-1">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-1">Form Fields</p>
                            {formColumns.map((col: any) => (
                              <label key={col.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer group">
                                <div
                                  onClick={() => toggleCol(col.id)}
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${selectedColumns.includes(col.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                                  {selectedColumns.includes(col.id) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                                </div>
                                <span className="text-sm text-slate-700 flex-1">{col.label}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${col.type === 'email' ? 'bg-blue-50 text-blue-600' : col.type === 'phone' ? 'bg-green-50 text-green-600' : col.type === 'number' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{col.type}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="p-4 border-t border-slate-100">
                        <div className="mb-3">
                          <label className="text-xs font-medium text-slate-600 block mb-1.5">Download Which Students?</label>
                          <select value={downloadStatus} onChange={e => setDownloadStatus(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-indigo-400">
                            <option value="all">All Students ({appTotal})</option>
                            <option value="applied">Applied Only</option>
                            <option value="shortlisted">Shortlisted Only</option>
                            <option value="attended">Attended Only</option>
                            <option value="selected">Selected Only</option>
                          </select>
                        </div>
                        <button
                          onClick={async () => {
                            if (selectedColumns.length === 0) return;
                            setDownloadLoading(true);
                            try {
                              const token = useAuthStore.getState().accessToken;
                              const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
                              const response = await fetch(`${apiBase}/drives/${driveId}/export/applications/custom`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                body: JSON.stringify({
                                  columns: selectedColumns,
                                  status: downloadStatus,
                                  formFields: formFields.map((f: any) => ({ id: f.id, label: f.label, type: f.type }))
                                })
                              });
                              if (!response.ok) throw new Error('Failed');
                              const disp = response.headers.get('Content-Disposition') || '';
                              const match = disp.match(/filename="(.+?)"/);
                              const fname = match?.[1] || 'applications.xlsx';
                              const blob = await response.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url; a.download = fname;
                              document.body.appendChild(a); a.click();
                              document.body.removeChild(a); URL.revokeObjectURL(url);
                              toast.success('Downloaded!');
                              setShowColumnPicker(false);
                            } catch { toast.error('Download failed'); }
                            finally { setDownloadLoading(false); }
                          }}
                          disabled={selectedColumns.length === 0 || downloadLoading}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                        >
                          {downloadLoading ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Generating...</>
                          ) : (
                            <><Download size={15}/> Download {selectedColumns.length} columns</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 mb-4">
              {['all', 'applied', 'shortlisted', 'attended', 'selected'].map(status => (
                <button
                  key={status}
                  onClick={() => setAppStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                    appStatusFilter === status
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {status === 'all' ? `All (${appTotal})` : status}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                value={appSearchQuery}
                onChange={e => setAppSearchQuery(e.target.value)}
                placeholder="Search by name, USN, email..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"/>
            </div>

            {/* Dynamic Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[12rem]">Candidate</th>
                      {tableFields.map((field: any) => (
                        <th key={field.id} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{field.label}</th>
                      ))}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Applied</th>
                      <th className="w-10 px-4 py-3"/>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3"><div className="h-4 w-4 bg-slate-200 rounded animate-pulse"/></td>
                          <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse"/><div className="space-y-1.5"><div className="h-3.5 w-28 bg-slate-200 rounded animate-pulse"/><div className="h-3 w-20 bg-slate-200 rounded animate-pulse"/></div></div></td>
                          {tableFields.map((f: any) => <td key={f.id} className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-200 rounded animate-pulse"/></td>)}
                          <td className="px-4 py-3"><div className="h-6 w-20 rounded-full bg-slate-200 animate-pulse"/></td>
                          <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-200 rounded animate-pulse"/></td>
                          <td/>
                        </tr>
                      ))
                    ) : displayApps.length === 0 ? (
                      <tr>
                        <td colSpan={tableFields.length + 5} className="px-4 py-16 text-center">
                          <div className="text-4xl mb-3">📭</div>
                          <p className="text-slate-500 font-medium">{applications.length === 0 ? 'No Applications Yet' : 'No Matches Found'}</p>
                          <p className="text-slate-400 text-sm mt-1">{applications.length === 0 ? 'Share the form link to start collecting applications' : 'Try adjusting your search or status filter'}</p>
                        </td>
                      </tr>
                    ) : displayApps.map((app: any, index: number) => {
                      // Smart name resolution: try formFields field ID first, then key-name search
                      const nameField = formFields.find((f: any) => {
                        const lbl = (f.label || '').toLowerCase();
                        return lbl.includes('name') && !lbl.includes('company');
                      });
                      let fullName = nameField ? getFieldValue(app, nameField) : '—';
                      if (fullName === '—') {
                        // Fallback to key-name search
                        const nameKeys = Object.keys(app.data || {});
                        const nameKey = nameKeys.find(k => k.toLowerCase() === 'fullname') || nameKeys.find(k => k.toLowerCase() === 'full_name') || nameKeys.find(k => k.toLowerCase() === 'name') || nameKeys.find(k => k.toLowerCase().includes('name') && !k.toLowerCase().includes('email'));
                        let resolved = (nameKey ? app.data[nameKey] : null);
                        if (!resolved || typeof resolved === 'object') {
                          const nested = nameKeys.reduce((acc: string, k: string) => {
                            if (acc) return acc;
                            const v = app.data[k];
                            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                              const innerKey = Object.keys(v).find(ik => ik.toLowerCase().includes('name'));
                              if (innerKey && typeof v[innerKey] === 'string') return v[innerKey];
                            }
                            return acc;
                          }, '');
                          resolved = nested || resolved || 'Unknown';
                        }
                        fullName = typeof resolved === 'string' ? resolved : 'Unknown';
                      }
                      const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <tr key={app._id}
                          onClick={() => { setSelectedApp(app); setShowDetailDrawer(true); }}
                          className="hover:bg-indigo-50/40 cursor-pointer transition-colors group">
                          <td className="px-4 py-3 text-sm text-slate-400">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {app.hasPhoto ? (
                                <img src={app.photoUrl?.startsWith('/') ? `${apiBase}${app.photoUrl.replace('/api/v1', '')}` : `${apiBase}/drives/${driveId}/applications/${app._id}/photo`}
                                  alt={fullName}
                                  className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}/>
                              ) : null}
                              <div className={`w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center flex-shrink-0 ${app.hasPhoto ? 'hidden' : ''}`}>{initials}</div>
                              <div>
                                <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{fullName}</div>
                                {app.driveStudentId ? (
                                  <div className="text-xs font-mono text-indigo-500 font-semibold">{app.driveStudentId}</div>
                                ) : (
                                  <div className="text-xs text-slate-400">{app.referenceNumber || app._id?.toString().slice(-8).toUpperCase()}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          {tableFields.map((field: any) => {
                            const value = getFieldValue(app, field);
                            const isCgpa = field.type === 'number' && field.label.toLowerCase().includes('cgpa');
                            return (
                              <td key={field.id} className="px-4 py-3 text-sm text-slate-700 max-w-[8rem] truncate">
                                {isCgpa ? (
                                  <span className={`font-semibold ${parseFloat(value) >= 8 ? 'text-green-600' : parseFloat(value) >= 6 ? 'text-amber-600' : 'text-red-500'}`}>{value}</span>
                                ) : (
                                  <span title={String(value)}>{String(value).length > 20 ? String(value).slice(0,20) + '...' : value}</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                              app.status === 'selected' ? 'bg-green-100 text-green-700'
                              : app.status === 'shortlisted' ? 'bg-indigo-100 text-indigo-700'
                              : app.status === 'attended' ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-600'
                            }`}>{app.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-3"><ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors"/></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Candidate Detail Drawer ── */}
            {showDetailDrawer && selectedApp && (() => {
              const app = selectedApp;
               // Smart name resolution for drawer: use same logic as table
              const drawerNameField = formFields.find((f: any) => {
                const lbl = (f.label || '').toLowerCase();
                return lbl.includes('name') && !lbl.includes('company');
              });
              let drawerName = drawerNameField ? getFieldValue(app, drawerNameField) : '—';
              if (drawerName === '—') {
                const dNameKeys = Object.keys(app.data || {});
                const dNameKey = dNameKeys.find(k => k.toLowerCase() === 'fullname') || dNameKeys.find(k => k.toLowerCase() === 'full_name') || dNameKeys.find(k => k.toLowerCase() === 'name') || dNameKeys.find(k => k.toLowerCase().includes('name') && !k.toLowerCase().includes('email'));
                let resolved = (dNameKey ? app.data[dNameKey] : null);
                if (!resolved || typeof resolved === 'object') {
                  const nested = dNameKeys.reduce((acc: string, k: string) => {
                    if (acc) return acc;
                    const v = app.data[k];
                    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                      const innerKey = Object.keys(v).find(ik => ik.toLowerCase().includes('name'));
                      if (innerKey && typeof v[innerKey] === 'string') return v[innerKey];
                    }
                    return acc;
                  }, '');
                  resolved = nested || resolved || 'Unknown';
                }
                drawerName = typeof resolved === 'string' ? resolved : 'Unknown';
              }
              const drawerInitials = drawerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

              const dataFields = formFields.filter((f: any) => f.type !== 'file_pdf' && f.type !== 'file_image');

              return (
                <>
                  <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => { setShowDetailDrawer(false); setSelectedApp(null); }}/>
                  <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    {/* Header */}
                    <div className="flex items-center gap-4 p-6 border-b border-slate-100">
                      <div className="relative flex-shrink-0">
                        {app.hasPhoto ? (
                          <img src={`${apiBase}/drives/${driveId}/applications/${app._id}/photo`} alt={drawerName}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-sm"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 text-2xl font-bold flex items-center justify-center">{drawerInitials}</div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          app.status === 'selected' ? 'bg-green-500' : app.status === 'shortlisted' ? 'bg-indigo-500' : 'bg-slate-400'
                        }`}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-slate-800 truncate">{drawerName}</h2>
                        <p className="text-sm text-slate-500">{app.referenceNumber || 'REF: ' + app._id?.toString().slice(-8).toUpperCase()}</p>
                        <span className={`inline-flex mt-1 text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                          app.status === 'selected' ? 'bg-green-100 text-green-700'
                          : app.status === 'shortlisted' ? 'bg-indigo-100 text-indigo-700'
                          : app.status === 'attended' ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                        }`}>{app.status}</span>
                      </div>
                      <button onClick={() => { setShowDetailDrawer(false); setSelectedApp(null); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                        <X size={20}/>
                      </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* Documents */}
                      {(app.hasResume || app.hasPhoto) && (
                        <div>
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Documents</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {app.hasResume && (
                              <a href={`${apiBase}/drives/${driveId}/applications/${app._id}/resume`} target="_blank" rel="noreferrer"
                                className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors group/doc">
                                <div className="w-10 h-10 bg-red-100 group-hover/doc:bg-red-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"><FileText size={20} className="text-red-600"/></div>
                                <div><div className="text-sm font-semibold text-red-700">Resume</div><div className="text-xs text-red-500">Click to view PDF</div></div>
                              </a>
                            )}
                            {app.hasPhoto && (
                              <a href={`${apiBase}/drives/${driveId}/applications/${app._id}/photo`} target="_blank" rel="noreferrer"
                                className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors group/doc">
                                <div className="w-10 h-10 bg-blue-100 group-hover/doc:bg-blue-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"><ImageIcon size={20} className="text-blue-600"/></div>
                                <div><div className="text-sm font-semibold text-blue-700">Photo</div><div className="text-xs text-blue-500">Click to view</div></div>
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Drive Student ID */}
                      {app.driveStudentId && (
                        <div>
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Drive ID</h3>
                          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="text-lg font-black font-mono text-indigo-700 tracking-wider">{app.driveStudentId}</div>
                            <button
                              onClick={() => { navigator.clipboard.writeText(app.driveStudentId); toast.success('Drive ID copied!'); }}
                              className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* All Form Fields */}
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Application Details</h3>
                        <div className="bg-slate-50 rounded-xl divide-y divide-slate-200 overflow-hidden border border-slate-200">
                          {dataFields.length > 0 ? (
                            dataFields.map((field: any) => {
                              const val = getFieldValue(app, field);
                              if (val === '—' || val === null || val === '') return null;
                              const isCgpa = field.type === 'number' && field.label.toLowerCase().includes('cgpa');
                              return (
                                <div key={field.id} className="flex items-start gap-4 px-4 py-3">
                                  <div className="text-xs text-slate-500 w-32 flex-shrink-0 pt-0.5 font-medium leading-relaxed">{field.label}</div>
                                  <div className="flex-1 text-sm text-slate-800 font-medium break-words">
                                    {isCgpa ? (
                                      <span className={`font-bold ${parseFloat(val) >= 8 ? 'text-green-600' : parseFloat(val) >= 6 ? 'text-amber-600' : 'text-red-500'}`}>{val} / 10</span>
                                    ) : field.type === 'email' ? (
                                      <a href={`mailto:${val}`} className="text-indigo-600 hover:underline">{val}</a>
                                    ) : field.type === 'phone' ? (
                                      <a href={`tel:${val}`} className="text-indigo-600 hover:underline">{val}</a>
                                    ) : Array.isArray(val) ? (
                                      <div className="flex flex-wrap gap-1">{val.map((v: string) => <span key={v} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{v}</span>)}</div>
                                    ) : String(val)}
                                  </div>
                                </div>
                              );
                            }).filter(Boolean)
                          ) : (
                            Object.entries(app.data || {})
                              .filter(([, value]) => {
                                // Skip non-displayable values (FileList, objects, etc.)
                                return typeof value === 'string' || typeof value === 'number' || (Array.isArray(value) && value.every(v => typeof v === 'string' || typeof v === 'number'));
                              })
                              .map(([key, value]) => (
                              <div key={key} className="flex items-start gap-4 px-4 py-3">
                                <div className="text-xs text-slate-500 w-32 flex-shrink-0 pt-0.5 font-medium capitalize">{key.replace(/_/g, ' ')}</div>
                                <div className="flex-1 text-sm text-slate-800 font-medium">{safeStr(value)}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Submission Info */}
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Submission Info</h3>
                        <div className="bg-slate-50 rounded-xl divide-y divide-slate-200 overflow-hidden border border-slate-200">
                          <div className="flex items-center gap-4 px-4 py-3">
                            <div className="text-xs text-slate-500 w-32 font-medium">Reference</div>
                            <div className="text-sm font-mono font-bold text-indigo-600">{app.referenceNumber || '—'}</div>
                          </div>
                          <div className="flex items-center gap-4 px-4 py-3">
                            <div className="text-xs text-slate-500 w-32 font-medium">Submitted</div>
                            <div className="text-sm text-slate-800">{app.submittedAt ? new Date(app.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                          </div>
                          {app.attendedAt && (
                            <div className="flex items-center gap-4 px-4 py-3">
                              <div className="text-xs text-slate-500 w-32 font-medium">Checked In</div>
                              <div className="text-sm text-slate-800">{new Date(app.attendedAt).toLocaleString('en-IN')}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-slate-100 p-4 flex gap-3 bg-white">
                      {app.hasResume && (
                        <a href={`${apiBase}/drives/${driveId}/applications/${app._id}/resume`} target="_blank" rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl py-2.5 text-sm font-medium transition-colors">
                          <Download size={15}/> Download Resume
                        </a>
                      )}
                      {app.status === 'applied' && (
                        <button
                          onClick={() => {
                            api.patch(`/drives/${driveId}/applications/${app._id}/status`, { status: 'shortlisted' })
                              .then(() => { toast.success('Marked as shortlisted'); fetchApplications(); setShowDetailDrawer(false); setSelectedApp(null); })
                              .catch(() => toast.error('Failed to update status'));
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
                          Shortlist Candidate
                        </button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          );
        })()}

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

            {/* SECTION 2: Shortlisted Students + Messaging */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-800">Shortlisted Students</h3>
                  <span className="bg-indigo-100 text-indigo-700 text-sm px-2.5 py-0.5 rounded-full font-semibold">{shortlistedStudents.length}</span>
                </div>
                <div className="flex items-center gap-3">
                  {selectedStudentIds.size > 0 && (
                    <span className="text-sm text-slate-500">{selectedStudentIds.size} selected</span>
                  )}
                  <DownloadButton url={`/drives/${driveId}/export/shortlisted`} label="Download" size="sm"/>
                  <button onClick={() => setShowTemplateBuilder(true)} disabled={shortlistedStudents.length === 0}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 shadow-sm">
                    <Send size={15}/>
                    {selectedStudentIds.size > 0 ? `Send to ${selectedStudentIds.size} selected` : 'Send to All'}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="w-10 px-4 py-3">
                        <div onClick={() => {
                          if (selectAllShortlist) { setSelectedStudentIds(new Set()); } else { setSelectedStudentIds(new Set(shortlistedStudents.map((s: any) => s._id))); }
                          setSelectAllShortlist(!selectAllShortlist);
                        }} className={`w-[18px] h-[18px] rounded border-2 cursor-pointer flex items-center justify-center transition-all ${selectAllShortlist ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'}`}>
                          {selectAllShortlist && <Check size={11} className="text-white" strokeWidth={3}/>}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Candidate</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">USN</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CGPA</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Drive ID</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shortlistedStudents.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-16">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100"><Users size={28}/></div>
                        <h3 className="text-lg font-bold text-slate-700 mb-1">No Shortlist Uploaded</h3>
                        <p className="text-slate-500 text-sm">Upload an Excel/CSV file above to shortlist students.</p>
                      </td></tr>
                    ) : shortlistedStudents.map((student: any) => {
                      const studentName = getStudentName(student);
                      const initials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                      const cgpa = getStudentCGPA(student);
                      const phone = String(getStudentPhone(student));
                      const email = String(getStudentEmail(student));
                      return (
                        <tr key={student._id} className={`hover:bg-slate-50 transition-colors ${selectedStudentIds.has(student._id) ? 'bg-indigo-50/50' : ''}`}>
                          <td className="px-4 py-3">
                            <div onClick={() => toggleStudentSelect(student._id)} className={`w-[18px] h-[18px] rounded border-2 cursor-pointer flex items-center justify-center transition-all ${selectedStudentIds.has(student._id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'}`}>
                              {selectedStudentIds.has(student._id) && <Check size={11} className="text-white" strokeWidth={3}/>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center flex-shrink-0">{initials}</div>
                              <div>
                                <div className="text-sm font-semibold text-slate-800">{studentName}</div>
                                <div className="text-xs text-slate-400">{email || 'No email'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{getStudentUSN(student)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{getStudentBranch(student)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-semibold ${parseFloat(cgpa) >= 8 ? 'text-green-600' : parseFloat(cgpa) >= 6 ? 'text-amber-600' : cgpa === '—' ? 'text-slate-400' : 'text-red-500'}`}>{cgpa}</span>
                          </td>
                          <td className="px-4 py-3">
                            {student.driveStudentId ? (
                              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">{student.driveStudentId}</span>
                            ) : <span className="text-slate-400 text-sm">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {phone && (
                                <a href={`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer" title="Open WhatsApp"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors">
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                </a>
                              )}
                              {email && (
                                <a href={`mailto:${email}?subject=${encodeURIComponent(`${drive?.companyName} Campus Drive Invitation`)}&body=${encodeURIComponent(buildQuickEmailBody(student))}`} title="Send Email"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                                  <Mail size={15}/>
                                </a>
                              )}
                              <button onClick={() => { setSelectedStudentIds(new Set([student._id])); setShowTemplateBuilder(true); }} title="Send with template"
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors">
                                <MessageSquare size={15}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── TEMPLATE BUILDER MODAL ── */}
            {showTemplateBuilder && (() => {
              const targetCount = selectedStudentIds.size > 0 ? selectedStudentIds.size : shortlistedStudents.length;
              const isAll = selectedStudentIds.size === 0;
              const previewStudent = shortlistedStudents[0];
              return (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowTemplateBuilder(false); }}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Message Template</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Sending to <strong className="text-indigo-600">{isAll ? `all ${targetCount} shortlisted students` : `${targetCount} selected student${targetCount > 1 ? 's' : ''}`}</strong></p>
                      </div>
                      <button onClick={() => setShowTemplateBuilder(false)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-hidden flex">
                      {/* LEFT: Template Editor */}
                      <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100">
                        {/* Channel selector */}
                        <div className="flex gap-1 mb-5 p-1 bg-slate-100 rounded-xl w-fit">
                          {(['whatsapp', 'email', 'both'] as const).map(c => (
                            <button key={c} onClick={() => setSendChannel(c)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sendChannel === c ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                              {c === 'both' ? '📱📧 Both' : c === 'whatsapp' ? '📱 WhatsApp' : '📧 Email'}
                            </button>
                          ))}
                        </div>

                        {/* WhatsApp template */}
                        {(sendChannel === 'whatsapp' || sendChannel === 'both') && (
                          <div className="mb-5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">W</span>
                              WhatsApp Message
                            </label>
                            <textarea value={whatsappTemplate} onChange={e => setWhatsappTemplate(e.target.value)} rows={8}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 font-mono resize-none"/>
                            <p className="text-xs text-slate-400 mt-1">Use *text* for bold in WhatsApp</p>
                          </div>
                        )}

                        {/* Email template */}
                        {(sendChannel === 'email' || sendChannel === 'both') && (
                          <div className="mb-5">
                            <label className="text-sm font-semibold text-slate-700 mb-2 block">📧 Email Subject</label>
                            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white text-sm mb-3 focus:outline-none focus:border-blue-400"/>
                            <label className="text-sm font-semibold text-slate-700 mb-2 block">Email Body (HTML)</label>
                            <textarea value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)} rows={10}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 font-mono resize-none"/>
                          </div>
                        )}

                        {/* Variables reference */}
                        <div className="bg-slate-50 rounded-xl p-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Available Variables (click to insert)</p>
                          <div className="flex flex-wrap gap-2">
                            {AVAILABLE_VARS.map(v => (
                              <button key={v.key} type="button" onClick={() => {
                                const tag = `{{${v.key}}}`;
                                if (sendChannel === 'whatsapp') setWhatsappTemplate(t => t + tag);
                                else setEmailTemplate(t => t + tag);
                              }} className="flex items-center gap-1 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-lg px-2.5 py-1.5 text-xs font-mono text-indigo-600 transition-all">
                                <span className="text-indigo-400">{'{{'}</span>{v.key}<span className="text-indigo-400">{'}}'}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Preview Panel */}
                      <div className="w-80 p-6 overflow-y-auto bg-slate-50/50">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">Preview</h3>
                        {previewStudent && (
                          <>
                            {(sendChannel === 'whatsapp' || sendChannel === 'both') && (
                              <div className="mb-4">
                                <div className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"/>WhatsApp</div>
                                <div className="bg-[#DCF8C6] rounded-2xl rounded-tl-none p-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm" style={{fontSize:'13px'}}>
                                  {resolvePreview(whatsappTemplate, previewStudent)}
                                </div>
                              </div>
                            )}
                            {(sendChannel === 'email' || sendChannel === 'both') && (
                              <div>
                                <div className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-full"/>Email</div>
                                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                                  <div className="text-xs font-semibold text-slate-600 mb-1.5 pb-1.5 border-b border-slate-100">Subject: {resolvePreview(emailSubject, previewStudent)}</div>
                                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: resolvePreview(emailTemplate, previewStudent) }}/>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 p-5 flex items-center justify-between bg-white rounded-b-2xl">
                      {sendProgress?.active ? (
                        <div className="flex-1 mr-4">
                          <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span>Sending... {sendProgress.sent} / {sendProgress.total}</span>
                            {sendProgress.failed > 0 && <span className="text-red-500">{sendProgress.failed} failed</span>}
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${Math.round((sendProgress.sent + sendProgress.failed) / sendProgress.total * 100)}%` }}/>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-500"><Info size={14}/>Messages will be personalized for each student</div>
                      )}
                      <div className="flex gap-3 flex-shrink-0">
                        <button onClick={() => setShowTemplateBuilder(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium">Cancel</button>
                        <button onClick={handleTemplateSend} disabled={sendProgress?.active}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
                          {sendProgress?.active ? (<><Loader2 size={15} className="animate-spin"/>Sending...</>) : (<><Send size={15}/>Send to {targetCount} {sendChannel === 'both' ? '(Email + WhatsApp)' : sendChannel === 'email' ? '(Email)' : '(WhatsApp)'}</>)}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
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

      {/* CLOSE CONFIRM MODAL */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
              <h3 className="font-bold text-lg text-red-900">Close Form</h3>
              <button onClick={() => setShowCloseConfirm(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-lg transition-colors border shadow-sm">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 font-medium">Are you sure you want to close this form? Students will not be able to submit after this.</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowCloseConfirm(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={closeFormNow} className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm">Close Form</button>
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
