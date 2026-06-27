import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Play, Zap, CheckCircle2, Users, Map, Settings, Loader2, AlertCircle, FileText, Copy, Check, Calendar, MessageSquare, QrCode } from 'lucide-react';
import ShortlistTab from './ShortlistTab';
import GodViewTab from './GodViewTab';
import FormBuilderTab from './FormBuilderTab';
import RegistrationsTab from './RegistrationsTab';
import DriveSettingsTab from './DriveSettingsTab';
import CommunicationsTab from './CommunicationsTab';
import QRDisplayModal from '../../../components/QRDisplayModal';

interface Drive {
  id: string;
  company_name: string;
  status: string;
  drive_date: string | null;
  package_offered: string | null;
  locations: string[];
  created_at: string;
  qr_type: string;
  current_qr_secret: string | null;
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
  const [activeTab, setActiveTab] = useState('registrations');
  const [drive, setDrive] = useState<Drive | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

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
      <div className="bg-card border border-border border-b-[3px] border-b-primary px-6 py-4 mb-4 rounded-xl shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <Link to="/admin/drives" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-1.5 w-max">
              <ChevronLeft size={16} /> All Drives
            </Link>
            
            {/* Error banner */}
            {error && (
              <div className="mb-3 flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-medium">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-2xl font-bold text-foreground leading-none">{drive.company_name}</h1>
              <span className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
            
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-4">
                {driveDate && <span className="flex items-center gap-1.5"><Calendar size={14} /> {driveDate}</span>}
                {drive.package_offered && <span className="flex items-center gap-1.5">💰 ₹{drive.package_offered} LPA</span>}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                {drive.locations?.length > 0 && <span className="flex items-center gap-1.5"><Map size={13} className="text-destructive/70" /> {drive.locations.join(', ')}</span>}
                <span className="font-mono text-muted-foreground/60">ID: {id}</span>
              </div>
            </div>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex gap-2.5 items-center mt-6">
            {(drive.status === 'active' || drive.status === 'event_day') && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/register/${id}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 bg-secondary/50 text-secondary-foreground border border-border rounded-lg hover:bg-secondary font-medium transition-colors text-xs flex items-center gap-1.5"
                title="Copy Student Registration Link"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                <span className="hidden sm:inline">{copied ? 'Copied Link' : 'Copy Registration Link'}</span>
              </button>
            )}
            
            {drive.status === 'event_day' && (
              <button
                onClick={() => setShowQRModal(true)}
                className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-lg hover:bg-secondary/80 font-bold transition-colors text-xs flex items-center gap-1.5"
                title="Show Check-in QR"
              >
                <QrCode size={14} />
                <span className="hidden sm:inline">Show QR</span>
              </button>
            )}
            
            <button className="px-3 py-1.5 bg-card border border-border text-foreground rounded-lg hover:bg-secondary font-medium transition-colors text-xs">
              Edit Details
            </button>
            
            {cfg.nextAction && (
              <button
                onClick={handleLifecycle}
                disabled={transitioning}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-sm hover:bg-primary/90 disabled:opacity-60 text-sm"
              >
                {transitioning
                  ? <><Loader2 size={14} className="animate-spin" /> Processing...</>
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
          { key: 'registrations', label: 'Registrations', icon: <Users size={15} /> },
          { key: 'shortlist', label: 'Shortlist (XLSX)', icon: <FileText size={15} /> },
          { key: 'form',      label: 'Registration Form', icon: <FileText size={15} /> },
          { key: 'godview',   label: 'Logistics (God View)', icon: <Map size={15} /> },
          { key: 'communications', label: 'Communications', icon: <MessageSquare size={15} /> },
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
        {activeTab === 'registrations' && <RegistrationsTab />}
        {activeTab === 'shortlist' && <ShortlistTab />}
        { activeTab === 'form'      && <FormBuilderTab /> }
        { activeTab === 'godview'   && <GodViewTab /> }
        { activeTab === 'communications' && <CommunicationsTab /> }
        { activeTab === 'settings'  && (
          <div className="p-6">
            <DriveSettingsTab drive={drive} onUpdate={setDrive} />
          </div>
        )}
      </div>

      {showQRModal && (
        <QRDisplayModal
          driveId={drive.id}
          driveName={drive.company_name}
          qrType={drive.qr_type}
          initialSecret={drive.current_qr_secret || drive.id}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}
