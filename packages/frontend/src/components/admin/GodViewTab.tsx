import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Megaphone,
  UploadCloud,
  Zap,
  ShieldOff,
  ArrowRight,
  RefreshCw,
  UserPlus,
  Activity,
  Building2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/use-socket';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from 'recharts';

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

  // ── Telemetry State ────────────────────────────────────────────────────────
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Original State (Latecomers, Events, etc) ───────────────────────────────
  const [latecomers, setLatecomers] = useState<LatecomersQueueItem[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isPaused, setIsPaused] = useState(drive?.isPaused || false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const liveEventRef = useRef<HTMLDivElement>(null);

  const addEvent = useCallback((evt: Omit<LiveEvent, 'id' | 'time'>) => {
    const newEvt: LiveEvent = {
      ...evt,
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
    setLiveEvents((prev) => [newEvt, ...prev].slice(0, 60));
  }, []);

  const fetchTelemetry = useCallback(async () => {
    try {
      const res: any = await api.get(`/drives/${driveId}/telemetry`);
      if (res.success) setTelemetry(res.data);
    } catch {
      /* silent */
    } finally {
      setLoadingStats(false);
    }
  }, [driveId]);

  useEffect(() => {
    fetchTelemetry();
    socket.emit('join:drive', driveId);
    socket.emit('join:drive:admin', driveId);

    // ── Socket listeners ────────────────────────────────────────────────────
    const onTelemetryUpdated = () => {
      fetchTelemetry();
    };

    const onVerified = (data: any) => {
      fetchTelemetry();
      addEvent({
        type: 'checkin',
        message: `${data?.studentName || 'Student'} checked in via QR`,
        badge: 'QR',
      });
    };

    const onLatecomer = (data: any) => {
      setLatecomers((prev) => [
        ...prev,
        { appId: data.appId, name: data.name, usn: data.usn, minutesLate: data.minutesLate },
      ]);
      addEvent({
        type: 'latecomer',
        message: `⏰ Latecomer alert: ${data.name} (${data.minutesLate}m late)`,
        badge: 'LATE',
      });
    };

    const onWalkIn = (data: any) => {
      fetchTelemetry();
      addEvent({
        type: 'walkin',
        message: `🚶 Walk-in: ${data.student?.name || 'Student'} registered`,
        badge: 'WALK-IN',
      });
    };

    const onPaused = (data: any) => {
      setIsPaused(data.isPaused);
      addEvent({
        type: 'system',
        message: data.isPaused ? '🚦 Drive PAUSED by admin' : '▶️ Drive RESUMED by admin',
        badge: data.isPaused ? 'PAUSED' : 'LIVE',
      });
    };

    socket.on('drive:telemetry_updated', onTelemetryUpdated);
    socket.on('student:verified', onVerified);
    socket.on('student:latecomer', onLatecomer);
    socket.on('event:walk_in_registered', onWalkIn);
    socket.on('drive:paused', onPaused);

    return () => {
      socket.off('drive:telemetry_updated', onTelemetryUpdated);
      socket.off('student:verified', onVerified);
      socket.off('student:latecomer', onLatecomer);
      socket.off('event:walk_in_registered', onWalkIn);
      socket.off('drive:paused', onPaused);
    };
  }, [driveId, fetchTelemetry, addEvent, socket]);

  const handlePanic = async () => {
    if (
      !confirm(
        isPaused
          ? 'Resume drive operations?'
          : 'PAUSE all drive operations? Invigilators will be locked out.',
      )
    )
      return;
    setPauseLoading(true);
    try {
      await api.patch(`/drives/${driveId}/pause`);
      toast.success(isPaused ? 'Drive Resumed' : 'Drive Paused');
      fetchTelemetry();
    } catch {
      toast.error('Failed to toggle pause');
    } finally {
      setPauseLoading(false);
    }
  };

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    if (!confirm('Send this message to ALL students in the drive?')) return;
    socket.emit('admin:broadcast', { driveId, message: broadcastMsg });
    toast.success('Broadcast sent!');
    addEvent({ type: 'system', message: `📢 Broadcast: "${broadcastMsg}"`, badge: 'BROADCAST' });
    setBroadcastMsg('');
  };

  const handleFinalSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('This will mark the listed students as HIRED and close the drive. Proceed?'))
      return;
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/final-selection`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success(data.data.message);
        onUpdate();
      } else throw new Error(data.error);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
    setUploadLoading(false);
    e.target.value = '';
  };

  const eventBadgeColor = (type: LiveEvent['type']) => {
    switch (type) {
      case 'checkin':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'latecomer':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'evaluation':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'room':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'walkin':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'system':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (loadingStats || !telemetry)
    return (
      <div className="flex items-center justify-center h-full bg-slate-950 text-slate-400">
        <Loader2 className="animate-spin w-8 h-8 text-sky-500" />
      </div>
    );

  const { funnel, globalAID, roomMatrix } = telemetry;
  const activeRoomsCount = roomMatrix.filter((r: any) => r.status !== 'idle').length;
  const bottleneckCount = roomMatrix.filter((r: any) => r.status === 'bottleneck').length;

  const funnelData = [
    { name: 'Checked In', value: funnel.attended, fill: '#3B82F6' },
    { name: 'Waiting', value: funnel.waiting, fill: '#8B5CF6' },
    { name: 'Interviewing', value: funnel.interviewing, fill: '#10B981' },
    { name: 'Hired', value: funnel.hired, fill: '#F59E0B' },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-950 space-y-6 font-sans text-slate-200">
      {/* ── TOP BAR: KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Panic / Resume Button */}
        <button
          onClick={handlePanic}
          disabled={pauseLoading}
          className={`col-span-1 flex items-center justify-center gap-2 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-70 border-2 ${
            isPaused
              ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400 hover:bg-emerald-900/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'bg-rose-950/50 border-rose-500 text-rose-400 hover:bg-rose-900/50 shadow-[0_0_20px_rgba(225,29,72,0.2)]'
          }`}
        >
          {pauseLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isPaused ? (
            <ArrowRight size={16} />
          ) : (
            <ShieldOff size={16} />
          )}
          {isPaused ? 'RESUME OPERATIONS' : 'HALT OPERATIONS'}
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
            <Users size={24} />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-100 leading-none">{funnel.attended}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Total Checked-In
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-100 leading-none">
              {globalAID} <span className="text-sm text-slate-500 font-medium">min</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Avg Interview Duration
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl p-4 flex items-center gap-4 shadow-lg border transition-all duration-500 ${bottleneckCount > 0 ? 'bg-rose-950/30 border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.15)] animate-pulse' : 'bg-slate-900 border-slate-800'}`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border ${bottleneckCount > 0 ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <div
              className={`text-3xl font-black leading-none ${bottleneckCount > 0 ? 'text-rose-400' : 'text-slate-100'}`}
            >
              {bottleneckCount}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Active Bottlenecks
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* LEFT COL: Funnel */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 w-full text-left">
              Pipeline Funnel
            </h3>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <FunnelChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      color: '#F8FAFC',
                      borderRadius: '12px',
                    }}
                    itemStyle={{ color: '#E2E8F0', fontWeight: 'bold' }}
                  />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList
                      position="right"
                      fill="#94A3B8"
                      stroke="none"
                      dataKey="name"
                      fontSize={12}
                      fontWeight="bold"
                    />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full mt-4 flex justify-between px-4">
              <div className="text-center">
                <div className="text-2xl font-black text-emerald-400">{funnel.hired}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Hired
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-rose-400">{funnel.rejected}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Rejected
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COL: Room Matrix */}
        <div className="xl:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Live Room Matrix
              </h3>
              <span className="text-xs font-bold bg-slate-800 text-slate-400 px-3 py-1 rounded-full">
                {activeRoomsCount} Active Rooms
              </span>
            </div>

            {roomMatrix.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-500 text-sm font-semibold border-2 border-dashed border-slate-800 rounded-xl">
                No rooms configured
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {roomMatrix.map((room: any) => {
                  let bgColor = 'bg-slate-800';
                  let borderColor = 'border-slate-700';
                  let textColor = 'text-slate-400';
                  let pulse = '';

                  if (room.status === 'healthy') {
                    bgColor = 'bg-emerald-950/40';
                    borderColor = 'border-emerald-500/50';
                    textColor = 'text-emerald-400';
                    pulse = 'animate-pulse';
                  } else if (room.status === 'bottleneck') {
                    bgColor = 'bg-rose-950/60';
                    borderColor = 'border-rose-500';
                    textColor = 'text-rose-400';
                    pulse = 'shadow-[0_0_15px_rgba(225,29,72,0.4)] animate-pulse';
                  }

                  return (
                    <div
                      key={room.roomId}
                      className={`rounded-xl border p-4 transition-all duration-300 ${bgColor} ${borderColor} ${pulse}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-200">{room.name}</div>
                        <div
                          className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                            room.status === 'idle'
                              ? 'bg-slate-700 text-slate-400'
                              : room.status === 'healthy'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {room.status}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">
                        {room.round.replace('_', ' ')}
                      </div>

                      {room.status !== 'idle' && room.occupant ? (
                        <div>
                          <div className="text-sm font-bold text-slate-300 truncate">
                            {room.occupant.name}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-500">{room.occupant.usn}</span>
                            <div className={`flex items-center gap-1 font-black ${textColor}`}>
                              <Clock size={12} />
                              {room.latencyMinutes}m / {room.threshold}m
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-slate-600 mt-6 text-center italic">
                          Waiting for candidate
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COL: Live Feed + Broadcast + Final Selection */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {/* Live Event Feed */}
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col"
            style={{ maxHeight: '400px' }}
          >
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={14} /> Telemetry Log
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <div
              ref={liveEventRef}
              className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-700"
            >
              {liveEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-sm">
                  System armed. Awaiting events...
                </div>
              ) : (
                liveEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex flex-col gap-1 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300"
                  >
                    <div className="flex justify-between items-center">
                      {evt.badge && (
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${eventBadgeColor(evt.type)}`}
                        >
                          {evt.badge}
                        </span>
                      )}
                      <span className="text-slate-500 shrink-0 font-mono text-[10px]">
                        {evt.time}
                      </span>
                    </div>
                    <span className="text-slate-300 font-medium text-xs leading-tight">
                      {evt.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Global Broadcast */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Megaphone size={14} /> Global Broadcast
            </h3>
            <textarea
              rows={2}
              className="w-full text-sm border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-sky-500 outline-none resize-none placeholder:text-slate-600 bg-slate-950 text-slate-200"
              placeholder="PA system override..."
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
            />
            <button
              onClick={handleBroadcast}
              disabled={!broadcastMsg.trim()}
              className="mt-2 w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-black text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(2,132,199,0.3)]"
            >
              TRANSMIT ALL
            </button>
          </div>

          {/* Final Selection */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg">
            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <CheckCircle size={14} /> Conclude Operations
            </h3>
            <p className="text-slate-500 text-xs mb-4 leading-relaxed">
              Upload final CSV. Drive will terminate.
            </p>
            <label
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm cursor-pointer transition-all shadow-md ${uploadLoading ? 'bg-emerald-950 text-emerald-600 cursor-not-allowed border border-emerald-900' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500'}`}
            >
              {uploadLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UploadCloud size={16} />
              )}
              Upload Hired CSV
              <input
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                disabled={uploadLoading}
                onChange={handleFinalSelection}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
