import { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { useSocket } from '../../hooks/use-socket';
import toast from 'react-hot-toast';
import {
  Send, Loader2, Users, ChevronRight, Megaphone, UserPlus,
  Pause, Play, CheckCircle2, ArrowRight, AlertTriangle, Radio
} from 'lucide-react';

interface Props {
  driveId: string;
  drive: any;
  attendedCount: number;
  activeRound: { type: string; status: string } | null;
  onAdvanced: () => void;
  onPauseToggled: (paused: boolean) => void;
}

interface BroadcastMsg {
  message: string;
  type: string;
  sentAt: string;
}

export function CommandPanel({ driveId, drive, attendedCount, activeRound, onAdvanced, onPauseToggled }: Props) {
  const socket = useSocket();
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [history, setHistory] = useState<BroadcastMsg[]>([]);
  const [walkIn, setWalkIn] = useState({ name: '', usn: '', branch: '' });
  const [registeringWalkIn, setRegisteringWalkIn] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isPaused = drive?.isPaused || false;

  // Quick-message presets
  const presets = [
    'Please proceed to your assigned room now.',
    'Round is about to begin. No entry after 2 minutes.',
    'Results will be announced shortly. Please wait.',
    'Please keep your phones on silent. No calls allowed.',
  ];

  const sendBroadcast = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      const d: any = await api.post(`/drives/${driveId}/broadcast`, { message: msg.trim(), type: 'info' });
      if (d.success) {
        setHistory(h => [d.data, ...h].slice(0, 8));
        setMsg('');
        toast.success('📢 Broadcast sent to all students!');
      } else toast.error(d.error || 'Failed to broadcast');
    } catch { toast.error('Broadcast failed'); }
    setSending(false);
  };

  const advancePresent = async () => {
    if (!activeRound) return;
    const ok = window.confirm(
      `Move all ${attendedCount} checked-in students to the next round?\nAll no-shows will be automatically rejected.`
    );
    if (!ok) return;
    setAdvancing(true);
    try {
      const d: any = await api.post(`/drives/${driveId}/rounds/${activeRound.type}/advance-present`);
      if (d.success) { toast.success(d.data.message || 'Students advanced!'); onAdvanced(); }
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Failed to advance students'); }
    setAdvancing(false);
  };

  const togglePause = async () => {
    setPausing(true);
    try {
      const d: any = await api.patch(`/drives/${driveId}/pause`);
      if (d.success) {
        onPauseToggled(d.data.isPaused);
        toast.success(d.data.isPaused ? '⏸️ Drive paused — students notified' : '▶️ Drive resumed');
      } else toast.error(d.error || 'Failed');
    } catch { toast.error('Failed to toggle pause'); }
    setPausing(false);
  };

  const registerWalkIn = async () => {
    if (!walkIn.name || !walkIn.usn) return toast.error('Name and USN are required');
    setRegisteringWalkIn(true);
    try {
      const d: any = await api.post(`/drives/${driveId}/walk-in`, walkIn);
      if (d.success) {
        toast.success(`✅ Walk-in registered: ${d.data.driveStudentId}`);
        setWalkIn({ name: '', usn: '', branch: '' });
        setShowWalkIn(false);
      } else toast.error(d.error || 'Failed');
    } catch { toast.error('Walk-in registration failed'); }
    setRegisteringWalkIn(false);
  };

  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30';

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">

      {/* ── ACTIVE ROUND ── */}
      <div className={`rounded-2xl border p-5 ${activeRound ? 'bg-indigo-950/60 border-indigo-700/50' : 'bg-slate-800/40 border-slate-700/40'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Active Round</span>
          {activeRound && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </span>
          )}
        </div>
        <div className="text-2xl font-black text-white mb-1">
          {activeRound ? activeRound.type.replace('_', ' ').toUpperCase() : 'No Active Round'}
        </div>
        <div className="text-sm text-slate-400 mb-4">
          {attendedCount} students checked in
        </div>

        <button
          onClick={advancePresent}
          disabled={advancing || !activeRound || attendedCount === 0}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-indigo-900/50"
        >
          {advancing ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Advance {attendedCount} Present <ArrowRight size={14} /></>}
        </button>
      </div>

      {/* ── PANIC BUTTON ── */}
      <button
        onClick={togglePause}
        disabled={pausing}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98] border ${
          isPaused
            ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-900/50'
            : 'bg-rose-600/20 hover:bg-rose-600/30 border-rose-600/40 text-rose-400 hover:text-rose-300'
        }`}
      >
        {pausing ? <Loader2 size={16} className="animate-spin" /> : isPaused ? <><Play size={16} /> Resume Drive</> : <><Pause size={16} /> Emergency Pause</>}
      </button>

      {/* ── BROADCAST ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone size={15} className="text-sky-400" />
          <span className="text-xs font-black uppercase tracking-widest text-sky-400">Broadcast</span>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {presets.map((p, i) => (
            <button key={i} onClick={() => setMsg(p)}
              className="text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-indigo-600/30 border border-slate-600/50 hover:border-indigo-500/50 px-2 py-1 rounded-lg transition-all"
            >{p.slice(0, 28)}…</button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendBroadcast(); }}
          rows={3}
          placeholder="Type a message to all students... (Ctrl+Enter to send)"
          className={inputCls + ' resize-none'}
        />
        <button
          onClick={sendBroadcast}
          disabled={sending || !msg.trim()}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-black py-2.5 rounded-xl text-sm transition-all active:scale-[0.98]"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {sending ? 'Sending…' : 'Broadcast to All'}
        </button>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2">
                <Radio size={11} className="text-sky-500 mt-0.5 shrink-0" />
                <span className="flex-1 leading-relaxed">{h.message}</span>
                <span className="shrink-0 opacity-50">{new Date(h.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── WALK-IN QUICK REG ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
        <button
          onClick={() => setShowWalkIn(v => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <UserPlus size={15} className="text-violet-400" />
            <span className="text-xs font-black uppercase tracking-widest text-violet-400">Walk-In Registration</span>
          </div>
          <ChevronRight size={14} className={`text-slate-500 transition-transform ${showWalkIn ? 'rotate-90' : ''}`} />
        </button>
        {showWalkIn && (
          <div className="mt-3 space-y-2">
            <input className={inputCls} placeholder="Full Name *" value={walkIn.name} onChange={e => setWalkIn(p => ({ ...p, name: e.target.value }))} />
            <input className={inputCls} placeholder="USN *" value={walkIn.usn} onChange={e => setWalkIn(p => ({ ...p, usn: e.target.value.toUpperCase() }))} />
            <input className={inputCls} placeholder="Branch (optional)" value={walkIn.branch} onChange={e => setWalkIn(p => ({ ...p, branch: e.target.value }))} />
            <button
              onClick={registerWalkIn}
              disabled={registeringWalkIn}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-black py-2.5 rounded-xl text-sm transition-all active:scale-[0.98]"
            >
              {registeringWalkIn ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {registeringWalkIn ? 'Registering…' : 'Register Walk-In'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
