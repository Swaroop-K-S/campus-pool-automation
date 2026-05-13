import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Play, Zap, CheckCircle2, Users, Map, Settings, Loader2, AlertCircle } from 'lucide-react';
import ShortlistTab from './ShortlistTab';
import GodViewTab from './GodViewTab';

interface Drive {
  id: string;
  company_name: string;
  status: string;
  drive_date: string | null;
  package_offered: string | null;
  locations: string[];
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; nextAction: string | null; nextEndpoint: string | null; nextIcon: React.ReactNode }> = {
  draft: {
    label: 'Draft',
    badge: 'bg-secondary text-muted-foreground border border-border',
    nextAction: 'Activate Drive',
    nextEndpoint: 'activate',
    nextIcon: <Zap size={16} className="fill-current" />,
  },
  active: {
    label: 'Active',
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    nextAction: 'Start Event Day',
    nextEndpoint: 'start-event-day',
    nextIcon: <Play size={16} className="fill-current" />,
  },
  event_day: {
    label: 'Event Day 🔴',
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    nextAction: 'Mark Completed',
    nextEndpoint: 'complete',
    nextIcon: <CheckCircle2 size={16} />,
  },
  completed: {
    label: 'Completed',
    badge: 'bg-primary/10 text-primary border border-primary/20',
    nextAction: null,
    nextEndpoint: null,
    nextIcon: null,
  },
};

export default function DriveDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('shortlist');
  const [drive, setDrive] = useState<Drive | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/drives/${id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { setDrive(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleLifecycle = async () => {
    if (!drive || !id) return;
    const cfg = STATUS_CONFIG[drive.status];
    if (!cfg?.nextEndpoint) return;

    setTransitioning(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/drives/${id}/${cfg.nextEndpoint}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setDrive(data);
      } else {
        setError(data.detail || 'Action failed. Please try again.');
      }
    } catch {
      setError('Network error. Is the backend running?');
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 size={28} className="animate-spin mr-3" />
        <span className="font-medium">Loading drive...</span>
      </div>
    );
  }

  if (!drive) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <AlertCircle size={40} className="mx-auto text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Drive not found</h3>
        <Link to="/admin/drives" className="text-primary hover:underline text-sm">← Back to Drives</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[drive.status] ?? STATUS_CONFIG.draft;
  const driveDate = drive.drive_date
    ? new Date(drive.drive_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border border-border border-b-[3px] border-b-primary px-8 py-6 mb-6 rounded-xl shadow-md">
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <Link to="/admin/drives" className="hover:text-primary transition-colors flex items-center gap-1">
            <ChevronLeft size={16} /> All Drives
          </Link>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{drive.company_name}</h1>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {driveDate && <span>📅 {driveDate}</span>}
              {drive.package_offered && <span>💰 ₹{drive.package_offered} LPA</span>}
              {drive.locations?.length > 0 && <span>📍 {drive.locations.join(', ')}</span>}
              <span className="font-mono text-xs">ID: {id?.slice(0, 10)}…</span>
            </div>
          </div>

          {/* Lifecycle Action Button */}
          <div className="flex gap-3 items-center">
            <button className="px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-secondary font-medium transition-colors text-sm">
              Edit Details
            </button>
            {cfg.nextAction && (
              <button
                onClick={handleLifecycle}
                disabled={transitioning}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 text-sm"
              >
                {transitioning
                  ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  : <>{cfg.nextIcon} {cfg.nextAction}</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {[
          { key: 'shortlist', label: 'Shortlist (XLSX)', icon: <Users size={15} /> },
          { key: 'godview',   label: 'Logistics (God View)', icon: <Map size={15} /> },
          { key: 'settings',  label: 'Settings',             icon: <Settings size={15} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 transition-colors border-b-2
              ${activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'shortlist' && <ShortlistTab />}
        {activeTab === 'godview'   && <GodViewTab />}
        {activeTab === 'settings'  && (
          <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">
            Settings panel coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
