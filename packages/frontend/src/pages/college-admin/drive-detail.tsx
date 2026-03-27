import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import {
  AlignLeft, AlignJustify, Hash,
  ChevronDown, ChevronRight, Circle, CheckSquare, Calendar, FileText, 
  Image as ImageIcon, GripVertical, Trash2, Edit2, Copy, Lock, Plus, X, UploadCloud, Mail,
  Presentation, PenTool, Code2, Users, Cpu, UserCheck, Download, Clock, Check, Search,
  Send, Loader2, Info, MessageSquare, SplitSquareHorizontal, UserPlus, Play, QrCode, Menu, BarChart2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useSocket } from '../../hooks/use-socket';
import { DownloadButton } from '../../components/shared/DownloadButton';
import { useAuthStore } from '../../store/auth.store';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DriveAuditLog from '../../components/admin/DriveAuditLog';
import { EventDayRoadmap } from '../../components/admin/EventDayRoadmap';

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
  { type: 'page_break', label: 'Page Break', icon: SplitSquareHorizontal },
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
  { id: 'field_name', type: 'text', label: 'Full Name', required: true, locked: true, order: 0 },
  { id: 'field_usn', type: 'text', label: 'USN', required: true, locked: true, order: 1, validation: { pattern: '^[A-Za-z0-9]{5,20}$', customErrorMessage: 'Must be a valid alphanumeric USN/Roll No' } },
  { id: 'field_email', type: 'email', label: 'Email Address', required: true, locked: true, order: 2, validation: { pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$', customErrorMessage: 'Valid email required' } },
  { id: 'field_phone', type: 'phone', label: 'Phone Number', required: true, locked: true, order: 3, validation: { pattern: '^\\d{10}$', customErrorMessage: 'Must be exactly 10 digits' } },
  { id: 'field_gender', type: 'dropdown', label: 'Gender', required: true, locked: true, order: 4, options: ['Male', 'Female', 'Other'] },
  { id: 'field_branch', type: 'dropdown', label: 'Branch', required: true, locked: true, order: 5, options: ['CSE', 'CSE (AIML)', 'CSE (Data Science)', 'ISE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'OTHER'] },
  { id: 'field_cgpa', type: 'number', label: 'CGPA', required: true, locked: true, order: 6, validation: { min: 0, max: 10, customErrorMessage: 'CGPA must be between 0 and 10' } },
];

const SortableFieldItem = ({ field, isActive, onSelect, onDelete, onDuplicate }: any) => {
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
      className={`rounded-lg border-2 p-4 mb-3 flex items-center gap-4 cursor-default transition-colors ${isActive ? 'border-indigo-500 shadow-sm bg-white' : field.type === 'page_break' ? 'border-dashed border-slate-300 bg-slate-50 hover:border-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
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
          <>
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(field); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg" title="Duplicate Field">
              <Copy size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(field.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete Field">
              <Trash2 size={16} />
            </button>
          </>
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
  const [appStats, setAppStats] = useState({ total: 0, applied: 0, shortlisted: 0, attended: 0, selected: 0 });
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [isEditingApp, setIsEditingApp] = useState(false);
  const [editedAppData, setEditedAppData] = useState<any>({});
  const [isSavingApp, setIsSavingApp] = useState(false);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [manualCandidateData, setManualCandidateData] = useState<Record<string, string>>({});
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);

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

  // Import Form State
  const [showImportModal, setShowImportModal] = useState(false);
  const [allDrives, setAllDrives] = useState<any[]>([]);
  const [importingDriveId, setImportingDriveId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', floor: '', capacity: 0, panelists: '' });
  const [liveStats, setLiveStats] = useState({ invited: 0, checkedIn: 0, activeRound: '', roomsOpen: 0 });
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});
  const [newExpertiseTags, setNewExpertiseTags] = useState<string[]>([]);
  const [expertiseInput, setExpertiseInput] = useState('');

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
    if (activeTab === 'Overview') {
      api.get(`/drives/${driveId}/applications/stats`).then((res: any) => {
        if (res.success) setAppStats(res.data);
      }).catch(console.error);
    }
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

  const saveApplicationData = async () => {
    if (!selectedApp) return;
    setIsSavingApp(true);
    try {
      await api.put(`/drives/${driveId}/applications/${selectedApp._id}`, { data: editedAppData });
      toast.success('Student details updated!');
      setIsEditingApp(false);
      fetchApplications();
      // Update local state to reflect change without forcing a full refresh of drawer
      setSelectedApp({ ...selectedApp, data: editedAppData });
    } catch (err) {
      toast.error('Failed to update details');
    } finally {
      setIsSavingApp(false);
    }
  };

  const saveManualCandidate = async () => {
    setIsAddingCandidate(true);
    try {
      await api.post(`/drives/${driveId}/applications/manual`, { data: manualCandidateData });
      toast.success('Candidate added manually!');
      setShowAddCandidateModal(false);
      setManualCandidateData({});
      fetchShortlisted();
      fetchApplications();
    } catch {
      toast.error('Failed to add candidate');
    } finally {
      setIsAddingCandidate(false);
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

  const fetchDrivesForImport = async () => {
    try {
      const res = await api.get('/drives');
      if ((res as any).success) {
        setAllDrives((res as any).data.filter((d: any) => d._id !== driveId));
      }
    } catch (error) {
      toast.error('Failed to fetch drives');
    }
  };

  const importFormFields = async () => {
    if (!importingDriveId) return toast.error('Select a drive to import from');
    setIsImporting(true);
    try {
      const res = await api.get(`/drives/${importingDriveId}/form`);
      if ((res as any).success && (res as any).data?.length > 0) {
        const importedFields = (res as any).data.map((f: any) => ({
          ...f,
          id: 'field_' + Math.random().toString(36).substring(2, 9)
        }));
        setFields(importedFields);
        toast.success(`Imported ${(res as any).data.length} fields! Please save the form.`);
        setShowImportModal(false);
      } else {
        toast.error('Selected drive has no form configured');
      }
    } catch (error) {
      toast.error('Failed to import form structure');
    } finally {
      setIsImporting(false);
    }
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
        // `scheduleState` state variable was removed because it was never read.
        // We can safely omit parsing it here.
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

  const startEventDay = async () => {
    try {
      await api.patch(`/drives/${driveId}/start-event`);
      toast.success('Event Day started! QR system is now active');
      fetchDriveDetails();
    } catch { toast.error('Failed to start event'); }
  };

  const activateDrive = async () => {
    try {
      await api.patch(`/drives/${driveId}/activate`);
      toast.success('Drive activated! Application form is now live.');
      fetchDriveDetails();
    } catch { toast.error('Failed to activate drive'); }
  };

  const [archiveLoading, setArchiveLoading] = useState(false);
  const handleArchiveDrive = async () => {
    if (!confirm('Are you sure you want to archive this drive and download the compliance report? Applications cannot be processed after archival.')) return;
    setArchiveLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/archive`, {
        headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
      });
      if (!response.ok) throw new Error('Failed to archive');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${drive?.companyName.replace(/\s+/g, '_')}_Compliance_Archive.xlsx`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      
      toast.success('Drive Archived Successfully!');
      fetchDriveDetails();
    } catch {
      toast.error('Failed to archive drive. Please check logs.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleDownloadFile = async (appId: string, type: 'resume' | 'photo') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/applications/${appId}/${type}`, {
        headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
      });
      if (!response.ok) throw new Error(`Failed to fetch ${type}`);
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Revoke the Object URL after a delay to clear memory without breaking the new tab immediately
      setTimeout(() => URL.revokeObjectURL(url), 10000); 
    } catch {
      toast.error(`Unable to open ${type}`);
    }
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

  const duplicateField = (field: any) => {
    const newField = { ...field, id: `field_${Date.now()}` };
    const fieldIndex = fields.findIndex(f => f.id === field.id);
    const newFields = [...fields];
    newFields.splice(fieldIndex + 1, 0, newField);
    setFields(newFields);
    setActiveFieldId(newField.id);
    toast.success('Field duplicated!');
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
      
      {/* Compact Header */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3 shrink-0 relative z-20">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/admin/dashboard" className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Back to Dashboard">
                <Menu size={18} />
              </Link>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-white text-indigo-700 font-black text-lg flex items-center justify-center border border-indigo-100/50 shadow-inner shrink-0">
                {drive.companyName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">{drive.companyName}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1 border ${
                      drive.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                      drive.status === 'event_day' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60' :
                      drive.status === 'draft' ? 'bg-slate-50 text-slate-500 border-slate-200/80' : 
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {(drive.status === 'active' || drive.status === 'event_day') && (
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${drive.status === 'active' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${drive.status === 'active' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                        </span>
                      )}
                      {drive.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{drive.jobRole}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* QR Check-in */}
              <button 
                onClick={() => window.open(`/event/${driveId}/qr-display`, '_blank')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all hover:shadow-md group relative ${
                  drive.status === 'event_day' ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200/60 hover:shadow-indigo-100' :
                  'text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200/60 hover:text-indigo-600'
                }`}
                title="Open QR Check-in Display"
              >
                <QrCode size={18} className="group-hover:scale-110 transition-transform" />
              </button>
              {/* Activate Drive */}
              {drive.status === 'draft' && (
                <button 
                  onClick={activateDrive}
                  className="px-4 py-2 rounded-xl font-bold text-white bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-95 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 text-sm"
                >
                  <Play size={14} className="fill-current"/> Activate
                </button>
              )}
              {/* Start Event Day */}
              {drive.status === 'active' && (
                <button 
                  onClick={startEventDay}
                  className="px-4 py-2 rounded-xl font-bold text-white bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-95 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 text-sm"
                >
                  <Play size={14} className="fill-current"/> Start Event Day
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium TABS */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 flex gap-8 shrink-0 relative z-10 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-x-auto hide-scrollbar">
        <div className="max-w-7xl mx-auto flex gap-6 w-full h-14">
          {['Overview', 'Form Builder', 'Applications', 'Shortlist', 'Event Day', 'Audit Log'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-2 py-4 font-bold text-sm transition-colors whitespace-nowrap group ${
                activeTab === tab ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.5)]"></div>
              )}
              {activeTab !== tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 rounded-t-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        
        {activeTab === 'Overview' && (
          <div className="p-8 overflow-y-auto h-full flex flex-col gap-6 bg-slate-50/50">
            
            {/* TOP ROW: Funnel & Quick Ops */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Funnel Graph */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center gap-2 mb-6 absolute top-0 right-0 bg-indigo-50 px-4 py-2 rounded-bl-2xl border-b border-l border-indigo-100">
                  <div className={`w-2.5 h-2.5 rounded-full ${drive.status === 'active' || drive.status === 'event_day' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-xs font-black uppercase text-indigo-800 tracking-wider flex items-center gap-1">{drive.status?.replace('_', ' ')}</span>
                </div>
                
                <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest mb-2"><AlignLeft size={16} className="inline mr-1 mb-0.5" /> Pipeline Funnel</h3>
                
                <div className="flex items-center border border-slate-100 rounded-2xl justify-between w-full mt-4 h-32 px-6 bg-slate-50 relative">
                  <div className="absolute top-1/2 left-10 right-10 h-1 bg-slate-200 -translate-y-1/2 rounded-full" />
                  {[
                    { label: 'Applied', count: appStats.total, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
                    { label: 'Shortlisted', count: appStats.shortlisted, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
                    { label: 'Attended', count: appStats.attended, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
                    { label: 'Selected', count: appStats.selected, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' }
                  ].map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1 relative z-10 hover:-translate-y-1 transition-transform cursor-default">
                      <div className={`w-16 h-16 rounded-2xl ${step.bg} ${step.color} flex items-center justify-center font-black text-2xl shadow-sm border ${step.border} ring-4 ring-slate-50 z-10`}>
                        {step.count}
                      </div>
                      <span className="text-xs font-bold text-slate-600 mt-3 uppercase tracking-wider bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Ops */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest mb-4"><Cpu size={16} className="inline mr-1 mb-0.5" /> Quick Operations</h3>
                <div className="space-y-3">
                  <button onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/apply/${drive.formToken}`);
                        toast.success('Public form link copied!');
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 rounded-xl transition-all font-bold text-sm group"
                  >
                     <span className="flex items-center gap-2"><Copy size={16} className="text-slate-400 group-hover:text-indigo-500" /> Copy Form Link</span>
                     <ChevronRight size={16} className="text-slate-300" />
                  </button>
                  <button onClick={() => setActiveTab('Form Builder')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-all font-bold text-sm group"
                  >
                     <span className="flex items-center gap-2"><AlignJustify size={16} className="text-slate-400 group-hover:text-slate-600" /> Modify Registration</span>
                     <ChevronRight size={16} className="text-slate-300" />
                  </button>
                  {drive.status !== 'completed' && (
                    <button onClick={() => setShowCloseConfirm(true)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl transition-all font-bold text-sm"
                    >
                       <span className="flex items-center gap-2"><Lock size={16} /> Halt Registrations</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: Key Metrics & Drive Rounds Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Key Metrics */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
                 <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest mb-6"><BarChart2 size={16} className="inline mr-1 mb-0.5" /> Event Parameters</h3>
                 
                 {/* Big Numbers */}
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-4 rounded-xl shadow-inner">
                      <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">Total Applied</p>
                      <p className="text-3xl font-black text-indigo-700">{appStats.total}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-xl shadow-inner">
                      <p className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Review</p>
                      <p className="text-3xl font-black text-emerald-700">{Math.max(0, appStats.total - appStats.shortlisted)}</p>
                    </div>
                 </div>

                 {/* Countdown timer */}
                 {drive.formCloseDate && drive.formStatus === 'open' && (
                   <div className="mb-6">
                     <CountdownTimer closeDate={drive.formCloseDate} />
                   </div>
                 )}

                 {/* Info List */}
                 <div className="space-y-4 flex-1">
                   <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                     <span className="text-slate-500 font-bold text-sm">Role Profile</span>
                     <span className="font-black text-slate-800 text-sm bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">{drive.jobRole}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                     <span className="text-slate-500 font-bold text-sm">Target Offer</span>
                     <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 text-lg">{drive.ctc}</span>
                   </div>
                   <div className="flex justify-between items-center pb-1">
                     <span className="text-slate-500 font-bold text-sm">Min CGPA</span>
                     <span className="font-black text-slate-700 text-sm">{drive.eligibility?.minCGPA || 'None'}</span>
                   </div>
                 </div>
              </div>

              {/* Drive Rounds (Actionable Checklists) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest"><CheckSquare size={16} className="inline mr-1 mb-0.5" /> Execution Modules</h3>
                   <button onClick={() => setActiveTab('Event Day')} className="text-indigo-600 text-sm font-bold hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors">Launch Event Console <ChevronRight size={16}/></button>
                 </div>
                 
                 <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                   {drive.rounds?.map((r: any, idx: number) => {
                     const isDone = r.status === 'completed';
                     const isActive = r.status === 'active';
                     return (
                       <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isActive ? 'bg-indigo-50 border-indigo-200 shadow-sm filter drop-shadow-sm' : isDone ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                         <div className="flex items-center gap-5">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${isDone ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-400'}`}>
                             {isDone ? <Check size={20} /> : (r.order || idx + 1)}
                           </div>
                           <div>
                             <h4 className={`font-bold text-sm ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>{r.label || r.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</h4>
                             <p className="text-xs font-bold mt-1 tracking-wide flex items-center gap-1">
                               {isDone ? <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">Module Completed</span> : isActive ? <span className="text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"/> Executing</span> : <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Pending Configuration</span>}
                             </p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           {!isDone && (
                             <button onClick={() => setActiveTab('Event Day')} className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-transform hover:scale-105 active:scale-95 ${isActive ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 shadow-indigo-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                               Manage
                             </button>
                           )}
                         </div>
                       </div>
                     );
                   })}
                   
                   {(!drive.rounds || drive.rounds.length === 0) && (
                     <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                       <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center text-slate-400 mb-4"><AlignJustify size={32} /></div>
                       <p className="text-slate-600 font-bold">No execution modules found.</p>
                       <p className="text-slate-400 text-sm mt-1">Configure your drive to set up automatic rounds.</p>
                     </div>
                   )}
                 </div>
              </div>
            </div>

            {/* Archive Feature */}
            {drive.status === 'completed' && (
              <div className="mt-2 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 lg:p-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 blur-2xl text-indigo-500">
                   <Cpu size={200} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Download className="text-indigo-400" size={24} /> Generate Compliance Archive
                  </h3>
                  <p className="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
                    Download a secure, master Excel file containing all applications, shortlist decisions, and communication audit logs for external sharing.
                  </p>
                </div>
                <button
                  onClick={handleArchiveDrive}
                  disabled={archiveLoading}
                  className="shrink-0 relative z-10 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-800 disabled:text-indigo-400 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2"
                >
                  {archiveLoading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />} 
                  {archiveLoading ? 'Archiving...' : 'Download Master Sheet'}
                </button>
              </div>
            )}
            
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
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">Form Preview</h2>
                <div className="flex items-center gap-3">
                  {formToken && (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/apply/${formToken}`);
                        toast.success('Public form link copied!');
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                      title="Copy Public Link"
                    >
                      <Copy size={14}/> Copy Link
                    </button>
                  )}
                  <button onClick={() => { setShowImportModal(true); fetchDrivesForImport(); }} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                    <Download size={14}/> Import Form
                  </button>
                  <span className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold">
                    {fields.length} Fields
                  </span>
                </div>
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
                        onDuplicate={duplicateField}
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
                        type="text" value={activeField.label}
                        onChange={e => updateActiveField({ label: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800 disabled:opacity-50"
                      />
                    </div>
                    
                    {!['file_pdf', 'file_image', 'checkbox', 'radio', 'dropdown', 'page_break'].includes(activeField.type) && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Placeholder</label>
                        <input 
                          type="text" value={activeField.placeholder || ''}
                          onChange={e => updateActiveField({ placeholder: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800 disabled:opacity-50"
                        />
                      </div>
                    )}

                    {activeField.type !== 'page_break' && (
                      <div className="flex items-center gap-2">
                         <input 
                           type="checkbox" id="req" checked={activeField.required} disabled={activeField.locked}
                           onChange={e => updateActiveField({ required: e.target.checked })}
                           className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-50"
                         />
                         <label htmlFor="req" className="text-sm font-bold text-slate-700 cursor-pointer">Required Field</label>
                      </div>
                    )}

                    {['text', 'email', 'phone'].includes(activeField.type) && (
                      <div className="pt-4 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Validation Rule (Regex)</label>
                        <select 
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800 mb-2 disabled:opacity-50"
                          disabled={activeField.locked}
                          value={
                            !activeField.validation?.pattern ? '' :
                            activeField.validation.pattern === '^\\d{10}$' ? 'phone' :
                            activeField.validation.pattern === '^[1-9][A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{3}$' ? 'usn' :
                            activeField.validation.pattern === '^https?:\\/\\/(www\\.)?linkedin\\.com\\/.*$' ? 'linkedin' :
                            activeField.validation.pattern === '^https?:\\/\\/(www\\.)?github\\.com\\/.*$' ? 'github' :
                            'custom'
                          }
                          onChange={e => {
                            const val = e.target.value;
                            let pattern = ''; let msg = 'Invalid format';
                            if (val === 'phone') { pattern = '^\\d{10}$'; msg = 'Must be exactly 10 digits'; }
                            else if (val === 'usn') { pattern = '^[A-Za-z0-9]{5,20}$'; msg = 'Must be a valid alphanumeric USN/Roll No'; }
                            else if (val === 'linkedin') { pattern = '^https?:\\/\\/(www\\.)?linkedin\\.com\\/.*$'; msg = 'Must be a valid LinkedIn URL'; }
                            else if (val === 'github') { pattern = '^https?:\\/\\/(www\\.)?github\\.com\\/.*$'; msg = 'Must be a valid GitHub URL'; }
                            
                            updateActiveField({ 
                              validation: val ? { ...activeField.validation, pattern, customErrorMessage: msg } : { ...activeField.validation, pattern: undefined, customErrorMessage: undefined } 
                            });
                          }}
                        >
                          <option value="">None</option>
                          <option value="phone">Phone Number (10 digits)</option>
                          <option value="usn">USN Format</option>
                          <option value="linkedin">LinkedIn URL</option>
                          <option value="github">GitHub URL</option>
                          <option value="custom">Custom Regex...</option>
                        </select>
                        {(activeField.validation?.pattern && !['^\\d{10}$', '^[1-9][A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{3}$', '^https?:\\/\\/(www\\.)?linkedin\\.com\\/.*$', '^https?:\\/\\/(www\\.)?github\\.com\\/.*$'].includes(activeField.validation.pattern)) && (
                          <input 
                            type="text" 
                            placeholder="e.g. ^[0-9]+$" 
                            value={activeField.validation.pattern || ''}
                            onChange={e => updateActiveField({ validation: { ...activeField.validation, pattern: e.target.value } })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800 font-mono mb-2"
                          />
                        )}
                        {(activeField.validation?.pattern) && (
                          <input 
                            type="text" 
                            placeholder="Custom error message" 
                            value={activeField.validation.customErrorMessage || ''}
                            onChange={e => updateActiveField({ validation: { ...activeField.validation, customErrorMessage: e.target.value } })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800"
                          />
                        )}
                      </div>
                    )}

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
                      <div className="flex items-center gap-2">
                        {!isEditingApp ? (
                          <button onClick={() => { setIsEditingApp(true); setEditedAppData(app.data); }}
                            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0" title="Edit Application">
                            <Edit2 size={18}/>
                          </button>
                        ) : (
                          <button onClick={() => setIsEditingApp(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0" title="Cancel Edit">
                            <X size={18}/>
                          </button>
                        )}
                        <button onClick={() => { setShowDetailDrawer(false); setSelectedApp(null); setIsEditingApp(false); }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                          <X size={20}/>
                        </button>
                      </div>
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
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Application Details</h3>
                          {isEditingApp && (
                            <button onClick={saveApplicationData} disabled={isSavingApp} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm text-xs font-bold disabled:opacity-50">
                              {isSavingApp ? 'Saving...' : 'Save Changes'}
                            </button>
                          )}
                        </div>
                        <div className="bg-slate-50 rounded-xl divide-y divide-slate-200 overflow-hidden border border-slate-200">
                          {dataFields.length > 0 ? (
                            dataFields.map((field: any) => {
                              const rawVal = isEditingApp ? editedAppData[field.id] : getFieldValue(app, field);
                              const val = rawVal === '—' || rawVal === null ? '' : rawVal;
                              if (!isEditingApp && val === '') return null;
                              const isCgpa = field.type === 'number' && field.label.toLowerCase().includes('cgpa');
                              return (
                                <div key={field.id} className="flex items-start gap-4 px-4 py-3 hover:bg-slate-100/50 transition-colors">
                                  <div className="text-xs text-slate-500 w-32 flex-shrink-0 pt-0.5 font-medium leading-relaxed">{field.label}</div>
                                  <div className="flex-1 text-sm text-slate-800 font-medium break-words">
                                    {isEditingApp ? (
                                      <input 
                                        type="text" 
                                        value={val || ''} 
                                        onChange={(e) => setEditedAppData({...editedAppData, [field.id]: e.target.value})}
                                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow bg-white"
                                      />
                                    ) : isCgpa ? (
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
                                return typeof value === 'string' || typeof value === 'number' || (Array.isArray(value) && value.every(v => typeof v === 'string' || typeof v === 'number'));
                              })
                              .map(([key, value]) => (
                              <div key={key} className="flex items-start gap-4 px-4 py-3">
                                <div className="text-xs text-slate-500 w-32 flex-shrink-0 pt-0.5 font-medium capitalize">{key.replace(/_/g, ' ')}</div>
                                <div className="flex-1 text-sm text-slate-800 font-medium break-words">
                                  {isEditingApp ? (
                                    <input 
                                      type="text" 
                                      value={String(editedAppData[key] || '')} 
                                      onChange={(e) => setEditedAppData({...editedAppData, [key]: e.target.value})}
                                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow bg-white"
                                    />
                                  ) : (
                                    safeStr(value)
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* File Uploads (Resume / Photo) */}
                      {(app.resumeFileId || app.photoFileId) && (
                        <div>
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Attachments</h3>
                          <div className="bg-slate-50 rounded-xl divide-y divide-slate-200 overflow-hidden border border-slate-200 mb-6">
                            {app.resumeFileId && (
                              <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-100/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <FileText size={18} className="text-indigo-500" />
                                  <div className="text-sm font-medium text-slate-700">Student Resume</div>
                                </div>
                                <button
                                  onClick={() => handleDownloadFile(app._id, 'resume')}
                                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                >
                                  <Download size={14} /> View File
                                </button>
                              </div>
                            )}
                            {app.photoFileId && (
                              <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-100/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <ImageIcon size={18} className="text-indigo-500" />
                                  <div className="text-sm font-medium text-slate-700">Student Photo</div>
                                </div>
                                <button
                                  onClick={() => handleDownloadFile(app._id, 'photo')}
                                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                >
                                  <ImageIcon size={14} /> View File
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Upload Shortlist</h3>
                <button onClick={() => setShowAddCandidateModal(true)} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                  <UserPlus size={16}/> Add Candidate Manually
                </button>
              </div>
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

            {/* ═══ SECTION 2: Advanced Rounds Roadmap ═══ */}
            <EventDayRoadmap driveId={driveId!} rounds={drive.rounds || []} onUpdate={fetchDriveDetails} />

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
                                    <button 
                                      onClick={async () => {
                                        try {
                                          const auth = JSON.parse(localStorage.getItem('campuspool-auth') || '{}');
                                          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/export/room/${rm._id}`, {
                                            headers: { Authorization: `Bearer ${auth.state?.accessToken}` }
                                          });
                                          if (!res.ok) throw new Error();
                                          const blob = await res.blob();
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = `Room_${rm.name}_Manifest.xlsx`;
                                          document.body.appendChild(a); a.click();
                                        } catch { toast.error('Failed to download manifest'); }
                                      }} 
                                      className="p-1 text-slate-400 hover:text-green-600 bg-slate-50 hover:bg-green-50 rounded" 
                                      title="Download Attendance Sheet (Excel)"
                                    >
                                      <Download size={13} />
                                    </button>
                                    <button className="p-1 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded ml-1"><Edit2 size={13} /></button>
                                    <button onClick={() => deleteRoomById(rm._id)} className="p-1 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded ml-1"><Trash2 size={13} /></button>
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
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><Copy size={18} className="text-indigo-600"/> Import Form Template</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-200 p-1.5 rounded-lg border border-slate-200 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4 font-medium">Select a previous drive to clone its form structure. <strong className="text-amber-600">Warning: This will overwrite your current unsaved fields.</strong></p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Previous Drives</label>
                  <select 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800"
                    value={importingDriveId}
                    onChange={e => setImportingDriveId(e.target.value)}
                  >
                    <option value="">-- Select Drive --</option>
                    {allDrives.map(d => (
                      <option key={d._id} value={d._id}>{d.companyName} ({new Date(d.createdAt).toLocaleDateString()})</option>
                    ))}
                  </select>
                </div>
                
                <button 
                  onClick={importFormFields}
                  disabled={!importingDriveId || isImporting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Import Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Audit Log' && (
        <DriveAuditLog driveId={driveId || ''} />
      )}

      {/* Add Candidate Modal */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add Candidate Manually</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pb-4">
              {formFields.filter(f => f.type !== 'file_pdf' && f.type !== 'file_image').map(f => (
                <div key={f.id}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder={`Enter ${f.label}`}
                    value={manualCandidateData[f.id] || ''}
                    onChange={e => setManualCandidateData({ ...manualCandidateData, [f.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setShowAddCandidateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl">Cancel</button>
              <button 
                onClick={saveManualCandidate} 
                disabled={isAddingCandidate}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
              >
                {isAddingCandidate ? 'Adding...' : 'Add Candidate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
