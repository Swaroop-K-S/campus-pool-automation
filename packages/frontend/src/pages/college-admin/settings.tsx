import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, UserPlus, Loader2, Plus, Trash2, Pencil, Check, X, Building2, Upload, FileSpreadsheet, Download } from 'lucide-react';

interface CampusRoom {
  id: string;
  name: string;
  capacity: number;
  location?: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: '', address: '', contactEmail: '' });
  const [smtp, setSmtp] = useState({ host: '', port: 587, user: '', pass: '' });
  const [twilio, setTwilio] = useState({ accountSid: '', authToken: '', fromNumber: '' });
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [drives, setDrives] = useState<{ _id: string; companyName: string; jobRole: string }[]>([]);
  const [hrForm, setHrForm] = useState({ name: '', email: '', password: '', driveId: '' });
  const [creatingHR, setCreatingHR] = useState(false);
  const [showHRPass, setShowHRPass] = useState(false);

  // Rooms state
  const [campusRooms, setCampusRooms] = useState<CampusRoom[]>([]);
  const [savingRooms, setSavingRooms] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState({ name: '', capacity: '', location: '' });
  const [showAddRoom, setShowAddRoom] = useState(false);

  useEffect(() => {
    document.title = 'Settings — CampusPool';
    api.get('/college/profile').then((d: any) => {
      if (d.success && d.data) {
        setProfile({ name: d.data.name || '', address: d.data.address || '', contactEmail: d.data.contactEmail || '' });
        if (d.data.smtpConfig) setSmtp(d.data.smtpConfig);
        if (d.data.twilioConfig) setTwilio(d.data.twilioConfig);
        if (d.data.campusRooms) setCampusRooms(d.data.campusRooms);
      }
    }).catch(() => {});
    api.get('/drives').then((d: any) => {
      if (d.success) setDrives(d.data || []);
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    try {
      const d: any = await api.put('/college/profile', profile);
      if (d.success) toast.success('Profile saved!');
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Error saving profile'); }
  };

  const saveSmtp = async () => {
    try {
      const d: any = await api.put('/college/smtp', smtp);
      if (d.success) toast.success('SMTP config saved!');
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Error saving SMTP'); }
  };

  const saveTwilio = async () => {
    try {
      const d: any = await api.put('/college/twilio', twilio);
      if (d.success) toast.success('Twilio config saved!');
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Error saving Twilio config'); }
  };

  const changePassword = async () => {
    if (pw.newPw !== pw.confirm) { toast.error('Passwords do not match'); return; }
    if (pw.newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    try {
      const d: any = await api.post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.newPw });
      if (d.success) { toast.success('Password updated!'); setPw({ current: '', newPw: '', confirm: '' }); }
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Error changing password'); }
  };

  // ─── Room DB helpers ─────────────────────────────────────────────
  const addRoom = () => {
    if (!newRoom.name.trim()) return toast.error('Room name is required');
    const cap = parseInt(newRoom.capacity);
    if (isNaN(cap) || cap < 1) return toast.error('Capacity must be a positive number');

    const room: CampusRoom = {
      id: `room-${Date.now()}`,
      name: newRoom.name.trim(),
      capacity: cap,
      location: newRoom.location.trim() || undefined,
    };
    setCampusRooms(prev => [...prev, room]);
    setNewRoom({ name: '', capacity: '', location: '' });
    setShowAddRoom(false);
  };

  // ─── Excel / CSV Bulk Import ──────────────────────────────────────
  const onDropExcel = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        let imported = 0;
        const newRooms: CampusRoom[] = [];

        rows.forEach((row: any) => {
          // Accept flexible column headers (case-insensitive)
          const name = (row['Room Name'] || row['room name'] || row['Name'] || row['name'] || '').toString().trim();
          const rawCap = row['Capacity'] || row['capacity'] || row['Cap'] || row['cap'] || '';
          const location = (row['Floor'] || row['floor'] || row['Location'] || row['location'] || '').toString().trim();
          const cap = parseInt(rawCap.toString());

          if (!name || isNaN(cap) || cap < 1) return; // skip malformed rows
          newRooms.push({ id: `room-${Date.now()}-${imported}`, name, capacity: cap, location: location || undefined });
          imported++;
        });

        if (imported === 0) {
          toast.error('No valid rows found. Check columns: Room Name, Capacity, Floor');
          return;
        }
        setCampusRooms(prev => [...prev, ...newRooms]);
        toast.success(`${imported} room${imported !== 1 ? 's' : ''} imported! Hit "Save Rooms" to persist.`);
      } catch {
        toast.error('Failed to parse file. Make sure it is a valid XLSX or CSV.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps: getExcelRootProps, getInputProps: getExcelInputProps, isDragActive: isExcelDragActive } = useDropzone({
    onDrop: onDropExcel,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Room Name', 'Capacity', 'Floor'],
      ['Computer Lab 1', 40, 'Block A, 2nd Floor'],
      ['Seminar Hall', 80, 'Main Block, Ground Floor'],
      ['Interview Cabin A', 8, 'Admin Block, 1st Floor'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rooms');
    XLSX.writeFile(wb, 'campuspool_rooms_template.xlsx');
  };

  const deleteRoom = (id: string) => {
    setCampusRooms(prev => prev.filter(r => r.id !== id));
  };

  const updateRoomField = (id: string, field: keyof CampusRoom, value: string | number) => {
    setCampusRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const saveRooms = async () => {
    setSavingRooms(true);
    try {
      const d: any = await api.put('/college/profile', { campusRooms });
      if (d.success) toast.success(`${campusRooms.length} room${campusRooms.length !== 1 ? 's' : ''} saved!`);
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Error saving rooms'); }
    setSavingRooms(false);
  };

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";
  const btnClass = "bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>

      {/* CARD 1 — College Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">College Profile</h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>College Name</label>
            <input className={inputClass} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Demo College of Engineering" />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <textarea className={inputClass + " min-h-[80px] resize-none"} value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} placeholder="Bangalore, Karnataka" />
          </div>
          <div>
            <label className={labelClass}>Event Contact Email</label>
            <input className={inputClass} type="email" value={profile.contactEmail} onChange={e => setProfile({ ...profile, contactEmail: e.target.value })} placeholder="placement@college.edu" />
          </div>
          <button onClick={saveProfile} className={btnClass}>Save Profile</button>
        </div>
      </div>

      {/* CARD — Campus Infrastructure (Global Rooms Database) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Building2 size={18} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Campus Infrastructure</h3>
              <p className="text-xs text-slate-500">Global rooms database — reuse across all placement drives</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
              {campusRooms.length} room{campusRooms.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={12} /> Template
            </button>
          </div>
        </div>

        {/* ─── Excel / CSV Bulk Import ─── */}
        <div
          {...getExcelRootProps()}
          className={`mb-4 border-2 border-dashed rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${
            isExcelDragActive
              ? 'border-indigo-400 bg-indigo-50/60'
              : 'border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-white'
          }`}
        >
          <input {...getExcelInputProps()} />
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            isExcelDragActive ? 'bg-indigo-100' : 'bg-slate-100'
          }`}>
            {isExcelDragActive
              ? <Upload size={18} className="text-indigo-600" />
              : <FileSpreadsheet size={18} className="text-slate-500" />}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">
              {isExcelDragActive ? 'Drop to import rooms…' : 'Bulk import from Excel / CSV'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Columns: <span className="font-mono">Room Name</span>, <span className="font-mono">Capacity</span>, <span className="font-mono">Floor</span> — drag & drop or click to upload</p>
          </div>
        </div>

        {/* Rooms Table */}
        {campusRooms.length > 0 && (
          <div className="mb-4 rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Room Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Capacity</th>
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Location / Floor</th>
                  <th className="px-4 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campusRooms.map(room => (
                  <tr key={room.id} className="hover:bg-slate-50/50 transition-colors group">
                    {editingRoomId === room.id ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800"
                            value={room.name}
                            onChange={e => updateRoomField(room.id, 'name', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800"
                            value={room.capacity}
                            onChange={e => updateRoomField(room.id, 'capacity', parseInt(e.target.value) || 1)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800"
                            value={room.location || ''}
                            placeholder="e.g. Block A, 2nd Floor"
                            onChange={e => updateRoomField(room.id, 'location', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setEditingRoomId(null)}
                              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 transition-colors"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => setEditingRoomId(null)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-slate-800">{room.name}</td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-md">
                            {room.capacity} seats
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{room.location || <span className="opacity-40">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingRoomId(room.id)}
                              className="w-7 h-7 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-200 flex items-center justify-center text-indigo-400 hover:text-indigo-600 transition-colors"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => deleteRoom(room.id)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Room Form */}
        {showAddRoom ? (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">New Room</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Room Name *</label>
                <input
                  className={inputClass}
                  value={newRoom.name}
                  onChange={e => setNewRoom(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Computer Lab 1"
                  onKeyDown={e => e.key === 'Enter' && addRoom()}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Capacity *</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={newRoom.capacity}
                  onChange={e => setNewRoom(p => ({ ...p, capacity: e.target.value }))}
                  placeholder="e.g. 40"
                  onKeyDown={e => e.key === 'Enter' && addRoom()}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Location / Floor</label>
                <input
                  className={inputClass}
                  value={newRoom.location}
                  onChange={e => setNewRoom(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. Block B, 1st Floor"
                  onKeyDown={e => e.key === 'Enter' && addRoom()}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={addRoom}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
              >
                <Plus size={14} /> Add Room
              </button>
              <button
                onClick={() => { setShowAddRoom(false); setNewRoom({ name: '', capacity: '', location: '' }); }}
                className="py-2 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddRoom(true)}
            className="flex items-center gap-2 border-2 border-dashed border-slate-300 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 font-semibold py-2.5 px-5 rounded-xl text-sm transition-all w-full justify-center mb-4 group"
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" /> Add Campus Room
          </button>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400">Changes are staged locally. Hit "Save Rooms" to persist.</p>
          <button
            onClick={saveRooms}
            disabled={savingRooms}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors"
          >
            {savingRooms ? <Loader2 size={14} className="animate-spin" /> : null}
            Save Rooms
          </button>
        </div>
      </div>

      {/* CARD 2 — SMTP Config */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Email (SMTP) Configuration</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>SMTP Host</label>
            <input className={inputClass} value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label className={labelClass}>SMTP Port</label>
            <input className={inputClass} type="number" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: Number(e.target.value) })} placeholder="587" />
          </div>
          <div>
            <label className={labelClass}>Email Username</label>
            <input className={inputClass} value={smtp.user} onChange={e => setSmtp({ ...smtp, user: e.target.value })} placeholder="noreply@college.edu" />
          </div>
          <div>
            <label className={labelClass}>Email Password</label>
            <div className="relative">
              <input className={inputClass + " pr-10"} type={showSmtpPass ? 'text' : 'password'} value={smtp.pass} onChange={e => setSmtp({ ...smtp, pass: e.target.value })} />
              <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <button onClick={saveSmtp} className={btnClass}>Save SMTP</button>
      </div>

      {/* CARD 3 — Twilio Config */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">WhatsApp (Twilio) Configuration</h3>
        <div className="space-y-4 mb-4">
          <div>
            <label className={labelClass}>Account SID</label>
            <input className={inputClass} value={twilio.accountSid} onChange={e => setTwilio({ ...twilio, accountSid: e.target.value })} placeholder="AC..." />
          </div>
          <div>
            <label className={labelClass}>Auth Token</label>
            <div className="relative">
              <input className={inputClass + " pr-10"} type={showTwilioToken ? 'text' : 'password'} value={twilio.authToken} onChange={e => setTwilio({ ...twilio, authToken: e.target.value })} />
              <button type="button" onClick={() => setShowTwilioToken(!showTwilioToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showTwilioToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>WhatsApp Number</label>
            <input className={inputClass} value={twilio.fromNumber} onChange={e => setTwilio({ ...twilio, fromNumber: e.target.value })} placeholder="whatsapp:+14155238886" />
          </div>
        </div>
        <button onClick={saveTwilio} className={btnClass}>Save Twilio</button>
      </div>

      {/* CARD 5 — Company HR Account Creation */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <UserPlus size={18} className="text-violet-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Create Company HR Account</h3>
            <p className="text-xs text-slate-500">Give the company recruiter read-only access to their drive's student pipeline</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>HR Name</label>
            <input className={inputClass} value={hrForm.name} onChange={e => setHrForm({ ...hrForm, name: e.target.value })} placeholder="Priya Sharma (TechCorp)" />
          </div>
          <div>
            <label className={labelClass}>HR Email</label>
            <input className={inputClass} type="email" value={hrForm.email} onChange={e => setHrForm({ ...hrForm, email: e.target.value })} placeholder="hr@techcorp.com" />
          </div>
          <div className="relative">
            <label className={labelClass}>Password</label>
            <input className={inputClass + ' pr-10'} type={showHRPass ? 'text' : 'password'} value={hrForm.password} onChange={e => setHrForm({ ...hrForm, password: e.target.value })} placeholder="Min. 8 characters" />
            <button type="button" onClick={() => setShowHRPass(!showHRPass)} className="absolute right-3 bottom-3 text-slate-400 hover:text-slate-600">
              {showHRPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div>
            <label className={labelClass}>Assigned Drive</label>
            <select className={inputClass} value={hrForm.driveId} onChange={e => setHrForm({ ...hrForm, driveId: e.target.value })}>
              <option value="">— Select Drive —</option>
              {drives.map(d => (
                <option key={d._id} value={d._id}>{d.companyName} · {d.jobRole}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={async () => {
            if (!hrForm.name || !hrForm.email || !hrForm.password || !hrForm.driveId) {
              return toast.error('All fields are required');
            }
            setCreatingHR(true);
            try {
              const d: any = await api.post('/hr/create-account', hrForm);
              if (d.success) {
                toast.success(`HR account created for ${hrForm.name}`);
                setHrForm({ name: '', email: '', password: '', driveId: '' });
              } else { toast.error(d.error || 'Failed'); }
            } catch (e: any) {
              toast.error(e.error || 'Failed to create HR account');
            } finally { setCreatingHR(false); }
          }}
          disabled={creatingHR}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {creatingHR ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          {creatingHR ? 'Creating…' : 'Create HR Account'}
        </button>
      </div>

      {/* CARD 4 — Change Password */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Change Password</h3>
        <div className="space-y-4 mb-4">
          <div>
            <label className={labelClass}>Current Password</label>
            <input className={inputClass} type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <input className={inputClass} type="password" value={pw.newPw} onChange={e => setPw({ ...pw, newPw: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input className={inputClass} type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />
          </div>
        </div>
        <button onClick={changePassword} className={btnClass}>Update Password</button>
      </div>
    </div>
  );
}
