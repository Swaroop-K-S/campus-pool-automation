import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Rocket, User, Mail, Copy, Check, MapPin, Loader2,
  RefreshCcw, ShieldCheck, Link2, AlertTriangle, Zap,
  ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

import type { Room } from '@campuspool/shared';

interface AllocationRow {
  roomId: string;
  hrName: string;
  hrEmail: string;
}

interface DispatchResult {
  hrEmail: string;
  hrName: string;
  roomId: string;
  magicLink: string;
}

// ── Sub-component: single copyable magic-link card ───────────────────────────

function MagicLinkCard({ result, roomMap }: { result: DispatchResult; roomMap: Record<string, Room> }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const room = roomMap[result.roomId];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <User size={18} className="text-indigo-600" />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{result.hrName}</p>
          <p className="text-slate-500 text-xs truncate">{result.hrEmail}</p>
        </div>

        {/* Room badge */}
        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5 shrink-0">
          <MapPin size={13} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-700">{room?.name ?? result.roomId.slice(-6)}</span>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            copied
              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ring-1 ring-indigo-200'
          }`}
          title="Copy Magic Link"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded URL row */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <Link2 size={13} className="text-slate-400 shrink-0" />
            <p className="text-xs text-slate-600 font-mono break-all">{result.magicLink}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface LaunchControlMatrixProps {
  driveId: string;
}

export function LaunchControlMatrix({ driveId }: LaunchControlMatrixProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [results, setResults] = useState<DispatchResult[] | null>(null);

  // ── Fetch rooms ────────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await api.get(`/drives/${driveId}/rooms`);
      const roomList: Room[] = (res as any).data ?? [];
      setRooms(roomList);
      // Pre-populate allocation rows
      setAllocations(
        roomList.map(r => ({ roomId: r._id as string, hrName: '', hrEmail: '' }))
      );
    } catch {
      toast.error('Failed to load rooms.');
    } finally {
      setLoadingRooms(false);
    }
  }, [driveId]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // ── Update allocation row field ────────────────────────────────────────────
  const updateAlloc = (roomId: string, field: 'hrName' | 'hrEmail', value: string) => {
    setAllocations(prev =>
      prev.map(a => a.roomId === roomId ? { ...a, [field]: value } : a)
    );
  };

  // ── Dispatch ───────────────────────────────────────────────────────────────
  const handleDispatch = async () => {
    // Only send rows that have been filled in
    const filled = allocations.filter(a => a.hrName.trim() && a.hrEmail.trim());
    if (filled.length === 0) {
      toast.error('Fill in at least one room allocation before dispatching.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = filled.find(a => !emailRegex.test(a.hrEmail));
    if (invalid) {
      toast.error(`Invalid email for "${invalid.hrName}": ${invalid.hrEmail}`);
      return;
    }

    setDispatching(true);
    setResults(null);
    try {
      const res = await api.post(`/drives/${driveId}/dispatch-hrs`, { allocations: filled });
      if ((res as any).success) {
        setResults((res as any).data);
        toast.success((res as any).message ?? 'Magic Links generated!');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.errors
        ? JSON.stringify(err.response.data.errors)
        : 'Dispatch failed. Please try again.';
      toast.error(msg);
    } finally {
      setDispatching(false);
    }
  };

  // ── Room lookup map ────────────────────────────────────────────────────────
  const roomMap = Object.fromEntries(rooms.map(r => [r._id, r]));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 overflow-y-auto custom-scrollbar h-full bg-[#F8FAFC]">
      {/* ── Header ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <Rocket size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800">Launch Control Matrix</h2>
            </div>
            <p className="text-slate-500 text-sm max-w-lg">
              Assign an HR Panelist to each room and dispatch their secure Magic Link in one click.
              Links are valid for <strong>24 hours</strong> and carry the room + drive context.
            </p>
          </div>
          <button
            onClick={fetchRooms}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-bold px-3 py-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-all"
          >
            <RefreshCcw size={15} /> Refresh
          </button>
        </div>
      </div>

      {loadingRooms ? (
        <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
          <Loader2 size={28} className="text-indigo-400 animate-spin" />
          <span className="ml-3 text-slate-500 font-bold">Loading rooms…</span>
        </div>
      ) : rooms.length === 0 ? (
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-amber-500" />
          </div>
          <h3 className="font-black text-slate-700 mb-1">No Rooms Found</h3>
          <p className="text-slate-500 text-sm">Set up rooms in the Command Center first before dispatching HR panelists.</p>
        </div>
      ) : (
        <>
          {/* ── Room allocation grid ── */}
          <div className="max-w-4xl mx-auto space-y-4 mb-8">
            {rooms.map(room => {
              const alloc = allocations.find(a => a.roomId === room._id)!;
              const existingPanelists = room.panelists ?? [];

              return (
                <div
                  key={room._id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                >
                  {/* Room header */}
                  <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                      <MapPin size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-800">{room.name}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {room.round} &bull; Capacity: {room.capacity}
                        {(room as any).isLocked && (
                          <span className="ml-2 text-rose-500 font-bold">🔒 Locked</span>
                        )}
                      </p>
                    </div>

                    {/* Existing panelists pill */}
                    {existingPanelists.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                        <ShieldCheck size={13} className="text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">
                          {existingPanelists.length} panelist{existingPanelists.length > 1 ? 's' : ''} already assigned
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Input row */}
                  <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                        <User size={12} /> HR Panelist Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        value={alloc?.hrName ?? ''}
                        onChange={e => updateAlloc(room._id!, 'hrName', e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                        <Mail size={12} /> HR Email
                      </label>
                      <input
                        type="email"
                        placeholder="priya@company.com"
                        value={alloc?.hrEmail ?? ''}
                        onChange={e => updateAlloc(room._id!, 'hrEmail', e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Dispatch CTA ── */}
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleDispatch}
              disabled={dispatching}
              className="w-full py-4 rounded-2xl font-black text-white text-base bg-gradient-to-br from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-xl shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {dispatching ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating Magic Links…
                </>
              ) : (
                <>
                  <Zap size={20} />
                  Dispatch Magic Links
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ── Results panel ── */}
      {results && results.length > 0 && (
        <div className="max-w-4xl mx-auto mt-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Check size={16} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">Magic Links Ready</h3>
              <p className="text-slate-500 text-xs">
                {results.length} link{results.length > 1 ? 's' : ''} generated — copy and forward to each panelist.
              </p>
            </div>
          </div>

          {/* Security notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 mb-5">
            <ShieldCheck size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 font-medium">
              Each link is a signed JWT valid for <strong>24 hours</strong>. The panelist will be authenticated directly without a password.
              Do not share links with unauthorized parties.
            </p>
          </div>

          <div className="space-y-3">
            {results.map(result => (
              <MagicLinkCard key={result.magicLink} result={result} roomMap={roomMap} />
            ))}
          </div>

          {/* Copy-all button */}
          <button
            onClick={async () => {
              const text = results.map(r => `${r.hrName} <${r.hrEmail}>\n${r.magicLink}`).join('\n\n');
              await navigator.clipboard.writeText(text);
              toast.success('All Magic Links copied to clipboard!');
            }}
            className="w-full mt-4 py-3 rounded-xl font-bold text-slate-700 text-sm bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center justify-center gap-2"
          >
            <Copy size={15} />
            Copy All Links to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}
