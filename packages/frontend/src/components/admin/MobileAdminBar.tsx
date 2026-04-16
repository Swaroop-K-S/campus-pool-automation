import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Megaphone, UserPlus, Pause, Play, Rocket, X, Send, Loader2 } from 'lucide-react';

interface Props {
  driveId: string;
  isPaused?: boolean;
  onPauseToggled?: (paused: boolean) => void;
  isEventDay?: boolean;
}

export function MobileAdminBar({ driveId, isPaused = false, onPauseToggled, isEventDay = false }: Props) {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<'broadcast' | 'walkin' | null>(null);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [walkIn, setWalkIn] = useState({ name: '', usn: '', branch: '' });
  const [registering, setRegistering] = useState(false);

  if (!isEventDay) return null;

  const sendBroadcast = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      const d: any = await api.post(`/drives/${driveId}/broadcast`, { message: msg.trim() });
      if (d.success) { toast.success('📢 Broadcast sent!'); setMsg(''); setSheet(null); }
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Broadcast failed'); }
    setSending(false);
  };

  const togglePause = async () => {
    setPausing(true);
    try {
      const d: any = await api.patch(`/drives/${driveId}/pause`);
      if (d.success) { onPauseToggled?.(d.data.isPaused); toast.success(d.data.isPaused ? '⏸️ Paused' : '▶️ Resumed'); }
    } catch { toast.error('Failed'); }
    setPausing(false);
  };

  const registerWalkIn = async () => {
    if (!walkIn.name || !walkIn.usn) return toast.error('Name & USN required');
    setRegistering(true);
    try {
      const d: any = await api.post(`/drives/${driveId}/walk-in`, walkIn);
      if (d.success) { toast.success(`✅ ${d.data.driveStudentId}`); setWalkIn({ name: '', usn: '', branch: '' }); setSheet(null); }
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Walk-in failed'); }
    setRegistering(false);
  };

  const inputCls = 'w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300';

  return (
    <>
      {/* Bottom bar — mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {/* Command Center */}
          <button
            onClick={() => navigate(`/admin/drives/${driveId}/command-center`)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors active:scale-95"
          >
            <Rocket size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Mission</span>
          </button>

          {/* Broadcast */}
          <button
            onClick={() => setSheet('broadcast')}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-sky-600 hover:bg-sky-50 transition-colors active:scale-95"
          >
            <Megaphone size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Broadcast</span>
          </button>

          {/* Walk-in */}
          <button
            onClick={() => setSheet('walkin')}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-violet-600 hover:bg-violet-50 transition-colors active:scale-95"
          >
            <UserPlus size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Walk-in</span>
          </button>

          {/* Pause */}
          <button
            onClick={togglePause}
            disabled={pausing}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors active:scale-95 ${
              isPaused ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            {pausing ? <Loader2 size={22} className="animate-spin" /> : isPaused ? <Play size={22} /> : <Pause size={22} />}
            <span className="text-[9px] font-black uppercase tracking-widest">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>

      {/* Bottom sheet backdrop */}
      {sheet && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setSheet(null)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />

            {/* Close */}
            <button onClick={() => setSheet(null)} className="absolute top-4 right-5 text-slate-400 hover:text-slate-700">
              <X size={20} />
            </button>

            {sheet === 'broadcast' && (
              <>
                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Megaphone size={18} className="text-sky-500" /> Broadcast Message
                </h3>
                <textarea
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  rows={4}
                  placeholder="Type your message to all students..."
                  className={inputCls + ' resize-none mb-3'}
                />
                <button
                  onClick={sendBroadcast}
                  disabled={sending || !msg.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-black py-3.5 rounded-2xl text-sm transition-all"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {sending ? 'Sending…' : 'Send to All Students'}
                </button>
              </>
            )}

            {sheet === 'walkin' && (
              <>
                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <UserPlus size={18} className="text-violet-500" /> Walk-In Registration
                </h3>
                <div className="space-y-3 mb-3">
                  <input className={inputCls} placeholder="Full Name *" value={walkIn.name} onChange={e => setWalkIn(p => ({ ...p, name: e.target.value }))} />
                  <input className={inputCls} placeholder="USN *" value={walkIn.usn} onChange={e => setWalkIn(p => ({ ...p, usn: e.target.value.toUpperCase() }))} />
                  <input className={inputCls} placeholder="Branch (optional)" value={walkIn.branch} onChange={e => setWalkIn(p => ({ ...p, branch: e.target.value }))} />
                </div>
                <button
                  onClick={registerWalkIn}
                  disabled={registering}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-black py-3.5 rounded-2xl text-sm transition-all"
                >
                  {registering ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {registering ? 'Registering…' : 'Register Walk-In'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
