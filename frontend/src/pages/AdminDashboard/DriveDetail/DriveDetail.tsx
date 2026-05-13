import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Play, Users, Map, Settings, Loader2 } from 'lucide-react';
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

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-secondary text-muted-foreground border border-border',
  active:    'bg-emerald-100 text-emerald-700 border border-emerald-200',
  event_day: 'bg-amber-100 text-amber-700 border border-amber-200',
  completed: 'bg-primary/10 text-primary border border-primary/20',
};

export default function DriveDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('shortlist');
  const [drive, setDrive] = useState<Drive | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/drives/${id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setDrive(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 size={28} className="animate-spin mr-3" />
        <span className="font-medium">Loading drive...</span>
      </div>
    );
  }

  const statusLabel = drive?.status
    ? drive.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Draft';
  const statusStyle = STATUS_STYLES[drive?.status ?? 'draft'] ?? STATUS_STYLES.draft;
  const driveDate = drive?.drive_date
    ? new Date(drive.drive_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border border-border border-b-[3px] border-b-primary px-8 py-6 mb-6 rounded-xl shadow-md">
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <Link to="/admin/drives" className="hover:text-primary transition-colors flex items-center gap-1">
            <ChevronLeft size={16} />
            All Drives
          </Link>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                {drive?.company_name ?? 'Drive Not Found'}
              </h1>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusStyle}`}>
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {driveDate && <span>📅 {driveDate}</span>}
              {drive?.package_offered && <span>💰 ₹{drive.package_offered} LPA</span>}
              {drive?.locations && drive.locations.length > 0 && <span>📍 {drive.locations.join(', ')}</span>}
              <span>ID: {id?.slice(0, 8)}...</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-secondary font-medium transition-colors">
              Edit Details
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-bold transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5">
              <Play size={16} className="fill-current" />
              Start Event Day
            </button>
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
