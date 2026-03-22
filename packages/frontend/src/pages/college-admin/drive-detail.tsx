import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, AlignLeft, AlignJustify, Hash,
  ChevronDown, Circle, CheckSquare, Calendar, FileText, 
  Image as ImageIcon, GripVertical, Trash2, Edit2, Copy, Lock, Plus, X, UploadCloud, MessageCircle, Mail
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
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
  const [liveStats, setLiveStats] = useState({ invited: 0, checkedIn: 0, activeRound: '' });

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
    // Socket Connection for Notifications Progress
    let socketInstance: any;
    import('socket.io-client').then(({ io }) => {
       socketInstance = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000', {
         auth: { token: localStorage.getItem('token') }
       });
       socketInstance.emit('join:drive', driveId);
       socketInstance.on('notify:progress', (data: { sent: number, total: number }) => {
         setNotifyProgress(data);
         if (data.sent >= data.total) {
            toast.success('Notifications blast completed!');
            setTimeout(() => setNotifyProgress(null), 3000);
         }
       });
       socketInstance.on('event:stats', (data: any) => {
         setLiveStats(prev => ({ ...prev, ...data }));
       });
    });
    return () => { if(socketInstance) socketInstance.disconnect(); }
  }, [driveId]);

  const fetchDriveDetails = async () => {
    try {
      const res = await api.get(`/drives/${driveId}`);
      if ((res as any).success) setDrive((res as any).data);
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
      if ((res as any).success) setApplications((res as any).data);
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
        if(d.venueDetails) {
          setHallName(d.venueDetails.hallName || '');
          setCapacity(d.venueDetails.capacity || 0);
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (activeTab === 'Event Day') fetchEventSetup();
  }, [activeTab, driveId]);

  const saveEventSetup = async () => {
    try {
      await api.post(`/drives/${driveId}/event-setup`, {
        hallName,
        capacity,
        eventDate,
        schedule: [{ roundType: 'report', startTime: reportTime, duration: 60 }]
      });
      toast.success('Venue details saved!');
    } catch { toast.error('Failed to save venue'); }
  };

  const saveRoom = async (roundName: string) => {
    try {
      const payload = {
        ...newRoom,
        round: roundName,
        panelists: newRoom.panelists.split(',').map(p => ({ name: p.trim(), expertise: [] }))
      };
      const res = await api.post(`/drives/${driveId}/rooms`, payload);
      if((res as any).success) {
         setRooms([...rooms, (res as any).data]);
         setShowAddRoom(null);
         setNewRoom({ name: '', floor: '', capacity: 0, panelists: '' });
         toast.success('Room added!');
      }
    } catch { toast.error('Failed to add room'); }
  };

  const activateRound = async (roundType: string) => {
    try {
      await api.put(`/drives/${driveId}/rounds/${roundType}/activate`);
      toast.success(`${roundType} is now active!`);
      // Update local drive state to reflect new statuses
      fetchDriveDetails();
    } catch { toast.error('Failed to activate round'); }
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
            <h3 className="text-xl font-bold text-slate-800 mb-6">Student Applications</h3>
            {applications.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-xl border border-slate-200 text-slate-500 font-bold">
                No applications yet. Share the form link to start collecting!
              </div>
            ) : (
              <div className="bg-white border text-sm border-slate-200 rounded-xl overflow-hidden">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50 border-b border-slate-200">
                       <th className="px-5 py-3 font-bold text-slate-600">Candidate</th>
                       <th className="px-5 py-3 font-bold text-slate-600">USN & Branch</th>
                       <th className="px-5 py-3 font-bold text-slate-600">CGPA</th>
                       <th className="px-5 py-3 font-bold text-slate-600">Status</th>
                       <th className="px-5 py-3 font-bold text-slate-600">Files</th>
                     </tr>
                   </thead>
                   <tbody>
                      {/* Apps will ideally be rendered here. This is a basic mapping based on typical payload. */}
                      {applications.map(app => (
                        <tr key={app._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-5 py-3 font-bold text-slate-800">{app.data?.fullName || 'N/A'}</td>
                          <td className="px-5 py-3 font-medium text-slate-600">{app.data?.usn} - {app.data?.branch}</td>
                          <td className="px-5 py-3 font-bold text-slate-700">{app.data?.cgpa}</td>
                          <td className="px-5 py-3"><span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 font-bold text-xs uppercase">{app.status}</span></td>
                          <td className="px-5 py-3 font-bold text-indigo-600 hover:underline cursor-pointer">
                            <a href={`/api/v1/drives/${driveId}/applications/${app._id}/resume`} target="_blank" rel="noreferrer">View PDF</a>
                          </td>
                        </tr>
                      ))}
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
          <div className="p-8 h-full overflow-y-auto w-full max-w-5xl mx-auto space-y-8 pb-32">
            {/* SECTION 1: Venue Setup */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5">Venue & Seminar Details</h3>
              <div className="grid grid-cols-2 gap-6 mb-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Seminar Hall Name</label>
                  <input type="text" value={hallName} onChange={e => setHallName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Hall Capacity</label>
                  <input type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Event Date</label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Report Time</label>
                  <input type="time" value={reportTime} onChange={e => setReportTime(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={saveEventSetup} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm">Save Venue Details</button>
              </div>
            </div>

            {/* SECTION 2: Round Schedule & Rooms */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5">
                 <h3 className="text-lg font-bold text-slate-800">Event Schedule & Rooms</h3>
              </div>
              
              <div className="space-y-6">
                {drive.rounds?.map((r: any, idx: number) => (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className={`px-5 py-4 flex items-center justify-between ${r.status === 'active' ? 'bg-indigo-50 border-b border-indigo-100' : 'bg-slate-50 border-b border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold">{idx + 1}</span>
                        <h4 className="font-bold text-slate-800">{r.type.replace('_', ' ').toUpperCase()}</h4>
                        {r.status === 'active' && <span className="flex items-center gap-2 px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div> LIVE</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm font-medium">
                        <div className="flex items-center gap-2"><Calendar size={16} className="text-slate-400"/> --:--</div>
                        <div className="flex flex-col gap-2">
                          {r.status !== 'active' && (
                             <button onClick={() => activateRound(r.type)} className="px-3 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 rounded text-xs font-bold text-slate-600 transition-colors shadow-sm">Activate This Round</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rooms */}
                    <div className="p-5 bg-white space-y-4">
                       <div className="flex justify-between items-center mb-2">
                         <h5 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{r.type.replace('_',' ')} Rooms</h5>
                         <button onClick={() => setShowAddRoom(r.type)} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus size={16} /> Add Room</button>
                       </div>

                       {showAddRoom === r.type && (
                         <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 grid grid-cols-5 gap-3 items-center">
                           <input type="text" placeholder="Room Name*" value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})} className="px-3 py-2 text-sm border border-slate-300 rounded outline-none focus:border-indigo-500" />
                           <input type="text" placeholder="Floor" value={newRoom.floor} onChange={e => setNewRoom({...newRoom, floor: e.target.value})} className="px-3 py-2 text-sm border border-slate-300 rounded outline-none focus:border-indigo-500" />
                           <input type="number" placeholder="Capacity*" value={newRoom.capacity || ''} onChange={e => setNewRoom({...newRoom, capacity: Number(e.target.value)})} className="px-3 py-2 text-sm border border-slate-300 rounded outline-none focus:border-indigo-500" />
                           <input type="text" placeholder="Panelists (csv)" value={newRoom.panelists} onChange={e => setNewRoom({...newRoom, panelists: e.target.value})} className="px-3 py-2 text-sm border border-slate-300 rounded outline-none focus:border-indigo-500" />
                           <button onClick={() => saveRoom(r.type)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded py-2 transition-colors cursor-pointer text-center">Save Room</button>
                         </div>
                       )}

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {rooms.filter(rm => rm.round === r.type).map(rm => (
                           <div key={rm._id} className="border border-slate-200 rounded-lg p-4 relative group hover:border-indigo-400 transition-colors">
                             <div className="flex justify-between items-start mb-2">
                               <h6 className="font-bold text-slate-800 tracking-wide">{rm.name} <span className="text-xs font-normal text-slate-500 bg-slate-100 px-1 py-0.5 rounded ml-1">Floor {rm.floor}</span></h6>
                               <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                               </div>
                             </div>
                             <div className="flex flex-wrap gap-1 mb-3">
                               {rm.panelists?.map((p: any, i: number) => <span key={i} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium rounded-full">{p.name || p}</span>)}
                             </div>
                             <div className="text-xs font-bold text-slate-500 flex items-center justify-between bg-slate-50 p-2 rounded">
                               <span>Assigned capacity</span> <span className="text-slate-800 font-black">0 / {rm.capacity}</span>
                             </div>
                           </div>
                         ))}
                         {rooms.filter(rm => rm.round === r.type).length === 0 && !showAddRoom && (
                           <p className="text-sm text-slate-400 italic font-medium p-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-center">No rooms configured for this round.</p>
                         )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 4: Live Stats */}
            {drive.status === 'event_day' || drive.status === 'active' && (
              <div className="fixed bottom-0 left-64 right-0 bg-slate-900 text-white p-5 flex justify-around items-center z-50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] border-t border-slate-800 backdrop-blur-md bg-opacity-95">
                 <div className="text-center"><p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div> Total Invited</p><p className="text-3xl font-black text-indigo-400">{liveStats.invited || 0}</p></div>
                 <div className="w-px h-12 bg-slate-800"></div>
                 <div className="text-center"><p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div> Checked In</p><p className="text-3xl font-black text-green-400">{liveStats.checkedIn || 0}</p></div>
                 <div className="w-px h-12 bg-slate-800"></div>
                 <div className="text-center"><p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Active Round</p><p className="text-xl font-bold text-white mt-1 border px-3 py-1 border-slate-700 bg-slate-800 rounded">{liveStats.activeRound || 'PENDING'}</p></div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
