import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, CheckCircle, XCircle, Clock, Loader2,
  Megaphone, UploadCloud, Zap, ShieldOff, ArrowRight, RefreshCw,
  UserPlus, Activity, Building2, ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/use-socket';

interface Props {
  drive: any;
  driveId: string;
  onUpdate: () => void;
}

interface LiveEvent {
  id: string;
  time: string;
  type: 'checkin' | 'latecomer' | 'evaluation' | 'room' | 'walkin' | 'system';
  message: string;
  badge?: string;
}

interface LatecomersQueueItem {
  appId: string;
  name: string;
  usn: string;
  minutesLate: number;
}

export function GodViewTab({ drive, driveId, onUpdate }: Props) {
  const socket = useSocket();

  // ── Live Counters ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ checkedIn: 0, active: 0, passed: 0, rejected: 0, total: 0 });
  const [rooms, setRooms] = useState<any[]>([]);
  const [latecomers, setLatecomers] = useState<LatecomersQueueItem[]>([]);
  const [evalTally, setEvalTally] = useState<Record<string, { pass: number; fail: number }>>({});
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isPaused, setIsPaused] = useState(drive?.isPaused || false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [rotateRoundFrom, setRotateRoundFrom] = useState('');
  const [rotateRoundTo, setRotateRoundTo] = useState('');
  const [rotateLoading, setRotateLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState(drive?.rounds?.[0]?.type || '');
  const liveEventRef = useRef<HTMLDivElement>(null);

  const addEvent = useCallback((evt: Omit<LiveEvent, 'id' | 'time'>) => {
    const newEvt: LiveEvent = {
      ...evt,
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    setLiveEvents(prev => [newEvt, ...prev].slice(0, 60));
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const [roomsRes, driveRes]: any[] = await Promise.all([
        api.get(`/drives/${driveId}/rooms`),
        api.get(`/drives/${driveId}`),
      ]);

      if (roomsRes.success) setRooms(roomsRes.data);

      if (driveRes.success) {
        const d = driveRes.data;
        const apps = d.applicationStats || {};
        setStats({
          total: apps.total || 0,
          checkedIn: apps.attended || 0,
          active: (apps.attended || 0) - (apps.selected || 0) - (apps.rejected || 0),
          passed: apps.selected || 0,
          rejected: apps.rejected || 0,
        });
        setIsPaused(d.isPaused || false);
      }
    } catch { /* silent */ } finally {
      setLoadingStats(false);
    }
  }, [driveId]);

  useEffect(() => {
    fetchStats();
    socket.emit('join:drive', driveId);
    // Join the admin-only room to receive drive:stats_updated from qr.controller
    socket.emit('join:drive:admin', driveId);

    // ── Socket listeners ────────────────────────────────────────────────────
    const onVerified = (data: any) => {
      setStats(s => ({ ...s, checkedIn: s.checkedIn + 1, active: s.active + 1 }));
      addEvent({ type: 'checkin', message: `${data?.studentName || 'Student'} checked in via QR`, badge: 'QR' });
    };

    // From the new drive:${driveId}:admin emit — provides exact checkedIn count
    const onStatsUpdated = (data: any) => {
      if (data.checkedIn !== undefined) {
        setStats(s => ({ ...s, checkedIn: data.checkedIn }));
      }
      if (data.studentName) {
        addEvent({ type: 'checkin', message: `${data.studentName} checked in`, badge: 'QR' });
      }
    };

    const onLatecomer = (data: any) => {
      setLatecomers(prev => [...prev, { appId: data.appId, name: data.name, usn: data.usn, minutesLate: data.minutesLate }]);
      addEvent({ type: 'latecomer', message: `⏰ Latecomer alert: ${data.name} (${data.minutesLate}m late)`, badge: 'LATE' });
    };

    const onEvalSubmit = (data: any) => {
      setEvalTally(prev => {
        const r = prev[data.roundType] || { pass: 0, fail: 0 };
        return {
          ...prev,
          [data.roundType]: {
            pass: data.decision === 'Pass' ? r.pass + 1 : r.pass,
            fail: data.decision === 'Fail' ? r.fail + 1 : r.fail,
          }
        };
      });
      const icon = data.decision === 'Pass' ? '✅' : '❌';
      addEvent({ type: 'evaluation', message: `${icon} Evaluation submitted in ${data.roundType?.replace('_', ' ')} by ${data.evaluatorName}`, badge: data.decision });
    };

    const onRoomUpdated = () => fetchStats();
    const onRoomLocked = (data: any) => {
      addEvent({ type: 'room', message: `🔒 Room ${data.roomName || data.roomId} locked`, badge: 'LOCK' });
      fetchStats();
    };

    const onWalkIn = (data: any) => {
      setStats(s => ({ ...s, checkedIn: s.checkedIn + 1, total: s.total + 1 }));
      addEvent({ type: 'walkin', message: `🚶 Walk-in: ${data.student?.name || 'Student'} registered`, badge: 'WALK-IN' });
    };

    const onRoundRotated = (data: any) => {
      toast.success(`Room rotation complete: ${data.totalAssigned} students moved`);
      addEvent({ type: 'system', message: `🔄 Room rotation: ${data.fromRound} → ${data.toRound} (${data.totalAssigned} students)`, badge: 'ROTATE' });
      fetchStats();
    };

    const onPaused = (data: any) => {
      setIsPaused(data.isPaused);
      addEvent({ type: 'system', message: data.isPaused ? '🚦 Drive PAUSED by admin' : '▶️ Drive RESUMED by admin', badge: data.isPaused ? 'PAUSED' : 'LIVE' });
    };

    const onDispatchAlert = (data: any) => {
      const { requestType, roomName, hrEmail } = data;
      const typeIcons: any = { 'technical': '🖥️', 'refreshment': '☕', 'stationery': '📄', 'other': '🔔' };
      const icon = typeIcons[requestType] || '🔔';

      const message = `Assistance Required in Room ${roomName} (${hrEmail})`;
      
      if (requestType === 'technical') {
        toast.error(`TECH EMERGENCY: Room ${roomName}\n${hrEmail}`, { 
          icon, 
          duration: Infinity,
          position: 'top-center',
          style: { minWidth: '350px', fontSize: '1.05rem', fontWeight: 'bold', border: '2px solid #ef4444' } 
        });
      } else {
        toast(`${requestType.toUpperCase()} ALERT: Room ${roomName}`, { 
          icon, 
          duration: 4000,
          position: 'top-right'
        });
      }
      
      addEvent({ type: 'system', message, badge: `HR: ${requestType.toUpperCase()}` });
    };

    const onDriveCompleted = () => {
      addEvent({ type: 'system', message: '🎉 Drive COMPLETED — Final selection uploaded', badge: 'DONE' });
      onUpdate();
    };

    const onNotifyComplete = (data: any) => {
      toast.success(`📬 Mass notify done: ${data.sent} sent, ${data.failed} failed`);
      addEvent({ type: 'system', message: `📬 Notifications complete: ${data.sent} sent, ${data.failed} failed`, badge: 'NOTIFY' });
    };

    socket.on('student:verified', onVerified);
    socket.on('drive:stats_updated', onStatsUpdated);
    socket.on('student:latecomer', onLatecomer);
    socket.on('invigilator:evaluation_submitted', onEvalSubmit);
    socket.on('room:updated', onRoomUpdated);
    socket.on('room:locked', onRoomLocked);
    socket.on('event:walk_in_registered', onWalkIn);
    socket.on('drive:round_rotated', onRoundRotated);
    socket.on('drive:paused', onPaused);
    socket.on('admin:dispatch_alert', onDispatchAlert);
    socket.on('drive:completed', onDriveCompleted);
    socket.on('drive:notify_complete', onNotifyComplete);

    return () => {
      socket.off('student:verified', onVerified);
      socket.off('drive:stats_updated', onStatsUpdated);
      socket.off('student:latecomer', onLatecomer);
      socket.off('invigilator:evaluation_submitted', onEvalSubmit);
      socket.off('room:updated', onRoomUpdated);
      socket.off('room:locked', onRoomLocked);
      socket.off('event:walk_in_registered', onWalkIn);
      socket.off('drive:round_rotated', onRoundRotated);
      socket.off('drive:paused', onPaused);
      socket.off('admin:dispatch_alert', onDispatchAlert);
      socket.off('drive:completed', onDriveCompleted);
      socket.off('drive:notify_complete', onNotifyComplete);
    };
  }, [driveId, fetchStats, addEvent, socket, onUpdate]);

  const handlePanic = async () => {
    if (!confirm(isPaused ? 'Resume drive operations?' : 'PAUSE all drive operations? Invigilators will be locked out.')) return;
    setPauseLoading(true);
    try {
      await api.patch(`/drives/${driveId}/pause`);
      toast.success(isPaused ? 'Drive Resumed' : 'Drive Paused');
      fetchStats();
    } catch { toast.error('Failed to toggle pause'); } finally { setPauseLoading(false); }
  };

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    if (!confirm('Send this message to ALL students in the drive?')) return;
    socket.emit('admin:broadcast', { driveId, message: broadcastMsg });
    toast.success('Broadcast sent!');
    addEvent({ type: 'system', message: `📢 Broadcast: "${broadcastMsg}"`, badge: 'BROADCAST' });
    setBroadcastMsg('');
  };

  const handleApproveLatecomer = async (item: LatecomersQueueItem) => {
    try {
      await api.post(`/drives/${driveId}/qr/approve-latecomer`, { appId: item.appId });
      setLatecomers(prev => prev.filter(l => l.appId !== item.appId));
      toast.success(`${item.name} approved`);
      addEvent({ type: 'latecomer', message: `✅ Latecomer approved: ${item.name}`, badge: 'APPROVED' });
    } catch { toast.error('Failed to approve'); }
  };

  const handleDenyLatecomer = (item: LatecomersQueueItem) => {
    setLatecomers(prev => prev.filter(l => l.appId !== item.appId));
    toast.success(`${item.name} denied`);
    addEvent({ type: 'latecomer', message: `❌ Latecomer denied: ${item.name}`, badge: 'DENIED' });
  };

  const handleRotateRooms = async () => {
    if (!rotateRoundFrom || !rotateRoundTo) { toast.error('Select both from/to rounds'); return; }
    if (!confirm(`Rotate students from ${rotateRoundFrom} rooms to ${rotateRoundTo} rooms?`)) return;
    setRotateLoading(true);
    try {
      const res: any = await api.post(`/drives/${driveId}/rooms/rotate`, { fromRound: rotateRoundFrom, toRound: rotateRoundTo });
      if (res.success) {
        toast.success(`Rotated ${res.data.totalAssigned} students to ${rotateRoundTo} rooms`);
        fetchStats();
      }
    } catch { toast.error('Room rotation failed'); } finally { setRotateLoading(false); }
  };

  const handleAdvancePresent = async () => {
    if (!selectedRound) return;
    if (!confirm(`Advance ALL students who checked in for "${selectedRound}" to the next round and reject no-shows?`)) return;
    try {
      const res: any = await api.post(`/drives/${driveId}/rounds/${selectedRound}/advance-present`);
      if (res.success) toast.success(res.data.message);
      else toast.error(res.error);
    } catch { toast.error('Failed to advance students'); }
  };

  const handleFinalSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('This will mark the listed students as HIRED and close the drive. Proceed?')) return;
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/final-selection`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.data.message);
        onUpdate();
      } else throw new Error(data.error);
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    setUploadLoading(false);
    e.target.value = '';
  };

  const roomColor = (room: any) => {
    const pct = (room.assignedStudents?.length || 0) / Math.max(room.capacity, 1);
    if (pct >= 0.9) return 'border-rose-300 bg-rose-50';
    if (pct >= 0.6) return 'border-amber-300 bg-amber-50';
    return 'border-emerald-300 bg-emerald-50';
  };
  const roomDotColor = (room: any) => {
    const pct = (room.assignedStudents?.length || 0) / Math.max(room.capacity, 1);
    if (pct >= 0.9) return 'bg-rose-500 animate-pulse';
    if (pct >= 0.6) return 'bg-amber-500';
    return 'bg-emerald-500';
  };
  const eventBadgeColor = (type: LiveEvent['type']) => {
    switch (type) {
      case 'checkin': return 'bg-blue-100 text-blue-700';
      case 'latecomer': return 'bg-amber-100 text-amber-700';
      case 'evaluation': return 'bg-purple-100 text-purple-700';
      case 'room': return 'bg-slate-100 text-slate-600';
      case 'walkin': return 'bg-teal-100 text-teal-700';
      case 'system': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loadingStats) return (
    <div className="flex items-center justify-center h-full text-slate-400">
      <Loader2 className="animate-spin w-8 h-8" />
    </div>
  );

  const rounds = drive?.rounds || [];

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50 space-y-5">

      {/* ── TOP BAR: Panic + KPIs ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">

        {/* Panic / Resume Button */}
        <button
          onClick={handlePanic}
          disabled={pauseLoading}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 disabled:opacity-70 ${isPaused
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
            }`}
        >
          {pauseLoading ? <Loader2 size={16} className="animate-spin" /> : isPaused ? <ArrowRight size={16} /> : <ShieldOff size={16} />}
          {isPaused ? '▶ Resume Drive' : '⛔ Pause All Operations'}
        </button>

        {/* KPI Cards */}
        {[
          { label: 'Checked In', value: stats.checkedIn, icon: CheckCircle, color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Still Active', value: stats.active, icon: Activity, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Hired', value: stats.passed, icon: Zap, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`flex items-center gap-3 px-5 py-3 rounded-xl border font-bold text-sm ${color} shadow-sm`}>
            <Icon size={18} />
            <div>
              <div className="text-xl font-black leading-none">{value}</div>
              <div className="text-[10px] uppercase tracking-widest opacity-70 mt-0.5">{label}</div>
            </div>
          </div>
        ))}

        <button onClick={fetchStats} className="ml-auto w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* LEFT COL: Rooms Heatmap + Rotate */}
        <div className="xl:col-span-1 space-y-4">

          {/* Room Heatmap */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Building2 size={14} /> Room Status Heatmap
            </h3>
            {rooms.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No rooms created yet</p>
            ) : (
              <div className="space-y-2">
                {rooms.map(room => {
                  const filled = room.assignedStudents?.length || 0;
                  const cap = room.capacity || 1;
                  const pct = Math.round((filled / cap) * 100);
                  return (
                    <div key={room._id} className={`p-3 rounded-xl border ${roomColor(room)} transition-all`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${roomDotColor(room)}`} />
                          <span className="font-bold text-sm text-slate-800">{room.name}</span>
                          {room.isLocked && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded font-black">LOCKED</span>}
                        </div>
                        <span className="text-xs font-black text-slate-600">{filled}/{cap}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500 bg-current"
                          style={{ width: `${pct}%`, color: pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981' }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span className="font-medium">{room.round?.replace('_', ' ').toUpperCase()}</span>
                        <span>{pct}% full</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Room Rotation Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <RefreshCw size={14} /> Room Rotation
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">From Round</label>
                <select value={rotateRoundFrom} onChange={e => setRotateRoundFrom(e.target.value)}
                  className="w-full text-sm font-semibold border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50">
                  <option value="">Select...</option>
                  {rounds.map((r: any) => <option key={r.type} value={r.type}>{r.label || r.type}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">To Round</label>
                <select value={rotateRoundTo} onChange={e => setRotateRoundTo(e.target.value)}
                  className="w-full text-sm font-semibold border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50">
                  <option value="">Select...</option>
                  {rounds.map((r: any) => <option key={r.type} value={r.type}>{r.label || r.type}</option>)}
                </select>
              </div>
              <button onClick={handleRotateRooms} disabled={rotateLoading || !rotateRoundFrom || !rotateRoundTo}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-black transition-all shadow-sm">
                {rotateLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Rotate Students
              </button>
            </div>
          </div>
        </div>

        {/* CENTER COL: Round Panel + Latecomer Queue */}
        <div className="xl:col-span-1 space-y-4">

          {/* Round Advancement Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={14} /> Round Operations
            </h3>

            <div className="space-y-2 mb-4">
              {rounds.map((r: any) => {
                const tally = evalTally[r.type] || { pass: 0, fail: 0 };
                const isSelected = selectedRound === r.type;
                return (
                  <button key={r.type} onClick={() => setSelectedRound(r.type)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r.status === 'completed' ? 'bg-emerald-500' : r.status === 'active' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className={`font-bold text-sm capitalize ${isSelected ? 'text-indigo-800' : 'text-slate-700'}`}>{r.label || r.type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black">
                      {(tally.pass + tally.fail) > 0 && (
                        <>
                          <span className="text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">✓ {tally.pass}</span>
                          <span className="text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">✗ {tally.fail}</span>
                        </>
                      )}
                      <ChevronRight size={14} className={isSelected ? 'text-indigo-500' : 'text-slate-300'} />
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedRound && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <button onClick={handleAdvancePresent}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-black transition-all shadow-sm">
                  <Zap size={14} /> Advance All Present
                </button>
                <label className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-xl text-sm font-black transition-all cursor-pointer">
                  {uploadLoading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                  Upload Pass List
                  <input type="file" accept=".csv,.xlsx" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setUploadLoading(true);
                    try {
                      const fd = new FormData(); fd.append('file', file);
                      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/rounds/${selectedRound}/results`, {
                        method: 'POST', body: fd, credentials: 'include'
                      });
                      const d = await res.json();
                      if (d.success) toast.success(`${d.data.advancedCount} students advanced!`);
                      else throw new Error(d.error);
                    } catch (err: any) { toast.error(err.message); }
                    setUploadLoading(false); e.target.value = '';
                  }} />
                </label>
              </div>
            )}
          </div>

          {/* Latecomer Queue */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock size={14} /> Latecomer Queue
              {latecomers.length > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{latecomers.length}</span>
              )}
            </h3>
            {latecomers.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">No pending latecomers</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {latecomers.map(item => (
                  <div key={item.appId} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-amber-700 font-bold uppercase">{item.usn} · {item.minutesLate}m late</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleApproveLatecomer(item)}
                        className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors" title="Approve">
                        <CheckCircle size={14} />
                      </button>
                      <button onClick={() => handleDenyLatecomer(item)}
                        className="w-8 h-8 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center transition-colors" title="Deny">
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Walk-In Shortcut */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <UserPlus size={14} /> Walk-In Registration
            </h3>
            <WalkInForm driveId={driveId} onSuccess={(name) => {
              addEvent({ type: 'walkin', message: `🚶 Walk-in: ${name} registered`, badge: 'WALK-IN' });
              fetchStats();
            }} />
          </div>
        </div>

        {/* RIGHT COL: Live Feed + Broadcast + Final Selection */}
        <div className="xl:col-span-1 space-y-4">

          {/* Live Event Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Activity size={14} /> Live Event Feed
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <div ref={liveEventRef} className="flex-1 max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {liveEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Events will appear here as they happen...</div>
              ) : (
                liveEvents.map(evt => (
                  <div key={evt.id} className="flex items-start gap-2 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="text-slate-400 shrink-0 font-mono mt-0.5">{evt.time}</span>
                    {evt.badge && (
                      <span className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 ${eventBadgeColor(evt.type)}`}>{evt.badge}</span>
                    )}
                    <span className="text-slate-700 font-medium leading-tight">{evt.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Global Broadcast */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Megaphone size={14} /> Global Broadcast
            </h3>
            <textarea
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-sky-400 outline-none resize-none placeholder:text-slate-400 bg-sky-50"
              placeholder="e.g. LUNCH BREAK EXTENDED BY 15 MINS"
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
            />
            <button onClick={handleBroadcast} disabled={!broadcastMsg.trim()}
              className="mt-2 w-full py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-black text-sm rounded-xl transition-all shadow-sm">
              📢 SEND TO ALL STUDENTS
            </button>
          </div>

          {/* Final Selection (Drive Close) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-5 shadow-lg">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" /> Close Drive — Final Hired List
            </h3>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">Upload XLSX/CSV with hired students' USNs. This will mark them as <em>Selected</em>, reject all others, and close the drive.</p>
            <label className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm cursor-pointer transition-all shadow-md ${uploadLoading ? 'bg-emerald-900 text-emerald-600 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'}`}>
              {uploadLoading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              Upload Final Hired CSV
              <input type="file" accept=".csv,.xlsx" className="hidden" disabled={uploadLoading} onChange={handleFinalSelection} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Walk-In Form Component
// ─────────────────────────────────────────────────────────────────────────────
function WalkInForm({ driveId, onSuccess }: { driveId: string; onSuccess: (name: string) => void }) {
  const [form, setForm] = useState({ name: '', usn: '', branch: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.usn) { toast.error('Name and USN are required'); return; }
    setLoading(true);
    try {
      const res: any = await api.post(`/drives/${driveId}/walk-in`, form);
      if (res.success) {
        toast.success(`${form.name} registered as walk-in!`);
        onSuccess(form.name);
        setForm({ name: '', usn: '', branch: '' });
      } else throw new Error(res.error);
    } catch (err: any) { toast.error(err.message || 'Registration failed'); }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {[
        { key: 'name', placeholder: 'Full Name *' },
        { key: 'usn', placeholder: 'USN / Roll No *' },
        { key: 'branch', placeholder: 'Branch (optional)' },
      ].map(({ key, placeholder }) => (
        <input key={key} type="text" placeholder={placeholder} value={(form as any)[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
        />
      ))}
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-black transition-all">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Register Walk-In
      </button>
    </form>
  );
}
