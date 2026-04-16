import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, ExternalLink, RefreshCw, AlertTriangle, QrCode, Building2, Laptop } from 'lucide-react';
import { CommandPanel } from '../../components/admin/CommandPanel';
import { LiveFeedPanel } from '../../components/admin/LiveFeedPanel';
import RoomsTab from '../../components/admin/RoomsTab';

export default function EventCommandCenter() {
  const { driveId } = useParams<{ driveId: string }>();
  const navigate = useNavigate();

  const [drive, setDrive] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rooms' | 'command' | 'feed'>('command'); // for mobile tabs

  const fetchAll = useCallback(async () => {
    if (!driveId) return;
    try {
      const [driveRes, roomsRes, appsRes]: any[] = await Promise.all([
        api.get(`/drives/${driveId}`),
        api.get(`/drives/${driveId}/rooms`),
        api.get(`/drives/${driveId}/applications`),
      ]);
      if (driveRes.success) setDrive(driveRes.data);
      if (roomsRes.success) setRooms(roomsRes.data || []);
      if (appsRes.success) setApps(appsRes.data?.applications || appsRes.data || []);
    } catch { toast.error('Failed to load drive data'); }
    setLoading(false);
  }, [driveId]);

  useEffect(() => {
    document.title = 'Command Center — CampusPool';
    fetchAll();
    const interval = setInterval(fetchAll, 20000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Computed stats
  const attendedCount = apps.filter((a: any) =>
    ['attended', 'selected'].includes(a.status) || a.status?.includes('passed')
  ).length;
  const walkInCount = apps.filter((a: any) => a.data?.walkIn).length;
  const activeRound = drive?.rounds?.find((r: any) => r.status === 'active') || null;

  // Smart no-show alerts
  const noShowRooms = rooms.filter(r => {
    const assigned = r.assignedStudents?.length || 0;
    const fill = assigned > 0 ? (attendedCount / assigned) : 0;
    return assigned > 0 && fill < 0.6 && activeRound;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Loading Command Center…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-4 px-5 py-3.5 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 shrink-0">
        <button onClick={() => navigate(`/admin/drives/${driveId}`)} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-black text-lg tracking-tight">{drive?.companyName}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400 font-medium text-sm">{drive?.jobRole}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <RefreshCw size={15} />
          </button>
          <Link
            to={`/event/${driveId}/qr-display`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-800/50 hover:border-indigo-600 bg-indigo-950/40 px-3 py-1.5 rounded-lg transition-all"
          >
            <QrCode size={13} /> QR Display <ExternalLink size={11} />
          </Link>
          <Link
            to={`/event/${driveId}/projector`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-300 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-all"
          >
            <Laptop size={13} /> Projector <ExternalLink size={11} />
          </Link>
        </div>
      </div>

      {/* ── SMART NO-SHOW ALERTS ── */}
      {noShowRooms.length > 0 && (
        <div className="px-5 pt-3 shrink-0">
          <div className="bg-amber-950/60 border border-amber-700/50 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-amber-400 mb-1">Smart No-Show Alert</p>
              <div className="flex flex-wrap gap-2">
                {noShowRooms.map(r => (
                  <span key={r._id} className="text-xs font-semibold text-amber-300 bg-amber-900/40 border border-amber-800/50 px-2 py-0.5 rounded-lg">
                    ⚠️ {r.name} — low fill ({r.assignedStudents?.length || 0} assigned)
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE TABS ── */}
      <div className="flex lg:hidden border-b border-slate-800 px-4 pt-3 gap-1 shrink-0">
        {([
          { key: 'rooms', label: 'Rooms', icon: Building2 },
          { key: 'command', label: 'Command', icon: Laptop },
          { key: 'feed', label: 'Live Feed', icon: RefreshCw },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === key
                ? 'text-white bg-slate-800 border border-b-0 border-slate-700'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── MAIN 3-COLUMN LAYOUT ── */}
      <div className="flex-1 overflow-hidden">

        {/* Desktop: 3 columns */}
        <div className="hidden lg:grid lg:grid-cols-[320px_1fr_300px] gap-0 h-full">

          {/* LEFT — Rooms */}
          <div className="border-r border-slate-800 overflow-y-auto p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <Building2 size={12} /> Rooms
            </p>
            <RoomsTab driveId={driveId!} drive={drive} />
          </div>

          {/* CENTER — Command */}
          <div className="overflow-y-auto p-5 border-r border-slate-800">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <Laptop size={12} /> Command
            </p>
            <CommandPanel
              driveId={driveId!}
              drive={drive}
              attendedCount={attendedCount}
              activeRound={activeRound}
              onAdvanced={fetchAll}
              onPauseToggled={(paused) => setDrive((d: any) => ({ ...d, isPaused: paused }))}
            />
          </div>

          {/* RIGHT — Live Feed */}
          <div className="overflow-y-auto p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </p>
            <LiveFeedPanel driveId={driveId!} checkedInCount={attendedCount} walkInCount={walkInCount} />
          </div>
        </div>

        {/* Mobile: Single active tab */}
        <div className="lg:hidden p-4 overflow-y-auto h-full">
          {activeTab === 'rooms' && <RoomsTab driveId={driveId!} drive={drive} />}
          {activeTab === 'command' && (
            <CommandPanel
              driveId={driveId!}
              drive={drive}
              attendedCount={attendedCount}
              activeRound={activeRound}
              onAdvanced={fetchAll}
              onPauseToggled={(paused) => setDrive((d: any) => ({ ...d, isPaused: paused }))}
            />
          )}
          {activeTab === 'feed' && <LiveFeedPanel driveId={driveId!} checkedInCount={attendedCount} walkInCount={walkInCount} />}
        </div>
      </div>
    </div>
  );
}
