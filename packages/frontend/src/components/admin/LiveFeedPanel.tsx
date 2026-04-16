import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/use-socket';
import { AlertTriangle, UserPlus, CheckCircle2, Bell, ArrowRight, X } from 'lucide-react';

interface FeedEvent {
  id: string;
  type: 'checkin' | 'walkin' | 'sos' | 'round' | 'broadcast' | 'selected';
  label: string;
  detail?: string;
  ts: number;
}

interface SOSAlert {
  applicationId: string;
  studentName: string;
  room: string;
  ts: number;
}

interface Props {
  driveId: string;
  checkedInCount: number;
  walkInCount: number;
}

export function LiveFeedPanel({ driveId, checkedInCount, walkInCount }: Props) {
  const socket = useSocket();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  const push = (ev: Omit<FeedEvent, 'id' | 'ts'>) => {
    setEvents(prev => [{ ...ev, id: `${Date.now()}-${Math.random()}`, ts: Date.now() }, ...prev].slice(0, 40));
  };

  useEffect(() => {
    socket.emit('join:drive', driveId);

    socket.on('student:verified', (d: any) => {
      push({ type: 'checkin', label: d.studentName ? `${d.studentName} checked in` : 'Student checked in', detail: `Total: ${d.count ?? '—'}` });
    });

    socket.on('event:walk_in_registered', (d: any) => {
      push({ type: 'walkin', label: `Walk-in: ${d.name || 'Unknown'}`, detail: `${d.driveStudentId} · ${d.usn || ''}` });
    });

    socket.on('student:sos', (d: any) => {
      push({ type: 'sos', label: `🆘 SOS from ${d.studentName || 'Student'}`, detail: `Room: ${d.room}` });
      setSosAlerts(prev => [{ applicationId: d.applicationId, studentName: d.studentName, room: d.room, ts: Date.now() }, ...prev]);
    });

    socket.on('round:status_changed', (d: any) => {
      push({ type: 'round', label: `Round changed: ${d.roundType?.replace('_', ' ').toUpperCase() || ''}`, detail: d.status });
    });

    socket.on('drive:broadcast', (d: any) => {
      push({ type: 'broadcast', label: `Broadcast sent`, detail: d.message?.slice(0, 60) });
    });

    socket.on('student:selected', () => {
      push({ type: 'selected', label: 'Student selected! 🎉', detail: 'Final selection processed' });
    });

    return () => {
      socket.off('student:verified');
      socket.off('event:walk_in_registered');
      socket.off('student:sos');
      socket.off('round:status_changed');
      socket.off('drive:broadcast');
      socket.off('student:selected');
    };
  }, [driveId]);

  const iconFor = (type: FeedEvent['type']) => {
    switch (type) {
      case 'checkin':  return <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />;
      case 'walkin':   return <UserPlus size={13} className="text-violet-400 shrink-0 mt-0.5" />;
      case 'sos':      return <AlertTriangle size={13} className="text-rose-400 shrink-0 mt-0.5" />;
      case 'round':    return <ArrowRight size={13} className="text-indigo-400 shrink-0 mt-0.5" />;
      case 'broadcast': return <Bell size={13} className="text-sky-400 shrink-0 mt-0.5" />;
      case 'selected': return <span className="text-[11px] shrink-0">🎉</span>;
    }
  };

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-950/50 border border-emerald-800/40 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-emerald-400">{checkedInCount}</div>
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mt-0.5">Checked In</div>
        </div>
        <div className="bg-violet-950/50 border border-violet-800/40 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-violet-400">{walkInCount}</div>
          <div className="text-xs font-bold text-violet-700 uppercase tracking-wider mt-0.5">Walk-ins</div>
        </div>
      </div>

      {/* SOS Alerts */}
      {sosAlerts.length > 0 && (
        <div className="bg-rose-950/60 border border-rose-700/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              SOS Alerts ({sosAlerts.length})
            </span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {sosAlerts.map(sos => (
              <div key={sos.applicationId + sos.ts} className="flex items-start justify-between gap-2 bg-rose-900/30 rounded-xl px-3 py-2">
                <div>
                  <div className="text-sm font-bold text-rose-300">{sos.studentName}</div>
                  <div className="text-xs text-rose-500">{sos.room}</div>
                </div>
                <button onClick={() => setSosAlerts(prev => prev.filter(s => s.ts !== sos.ts))} className="text-rose-600 hover:text-rose-400 transition-colors mt-0.5">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Feed */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Live Feed</span>
        </div>
        <div ref={feedRef} className="space-y-2 max-h-[400px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-sm">
              <div className="text-2xl mb-2">📡</div>
              Waiting for live events…
            </div>
          ) : (
            events.map(ev => (
              <div key={ev.id} className={`flex items-start gap-2 px-3 py-2 rounded-xl text-xs transition-all ${
                ev.type === 'sos' ? 'bg-rose-900/30' :
                ev.type === 'walkin' ? 'bg-violet-900/20' :
                ev.type === 'selected' ? 'bg-indigo-900/20' :
                'bg-slate-900/30'
              }`}>
                {iconFor(ev.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-200 leading-tight">{ev.label}</div>
                  {ev.detail && <div className="text-slate-500 mt-0.5 truncate">{ev.detail}</div>}
                </div>
                <div className="shrink-0 text-slate-600 text-[10px] tabular-nums">{timeAgo(ev.ts)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
