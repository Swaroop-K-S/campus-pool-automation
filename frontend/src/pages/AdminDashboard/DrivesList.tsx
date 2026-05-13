import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Calendar, MapPin, Plus, ChevronRight, Clock, Loader2 } from 'lucide-react';

interface Drive {
  id: string;
  company_name: string;
  package_offered: string | null;
  locations: string[];
  drive_date: string | null;
  status: 'draft' | 'active' | 'event_day' | 'completed';
  created_at: string;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-secondary text-muted-foreground border border-border' },
  active:    { label: 'Active',    className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  event_day: { label: 'Event Day', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
  completed: { label: 'Completed', className: 'bg-primary/10 text-primary border border-primary/20' },
};

export default function DrivesList() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/drives/')
      .then(res => res.json())
      .then(data => {
        setDrives(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load drives. Is the backend running?');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 size={28} className="animate-spin mr-3" />
        <span className="font-medium">Loading drives...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Placement Drives</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{drives.length} drive{drives.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link
          to="/admin/drives/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg shadow-sm hover:bg-primary/90 hover:-translate-y-0.5 transition-all"
        >
          <Plus size={18} />
          New Drive
        </Link>
      </div>

      {/* Drives Grid */}
      {drives.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No drives yet</h3>
          <p className="text-muted-foreground mb-6">Create your first placement drive to get started.</p>
          <Link
            to="/admin/drives/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} /> Create Drive
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {drives.map(drive => {
            const style = STATUS_STYLES[drive.status] ?? STATUS_STYLES.draft;
            const driveDate = drive.drive_date
              ? new Date(drive.drive_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Date TBD';

            return (
              <Link
                key={drive.id}
                to={`/admin/drives/${drive.id}`}
                className="group bg-card border border-border border-b-[3px] border-b-primary rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Building2 size={22} className="text-primary" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style.className}`}>
                    {style.label}
                  </span>
                </div>

                {/* Company name */}
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                  {drive.company_name}
                </h3>
                {drive.package_offered && (
                  <p className="text-sm text-muted-foreground mb-3 font-medium">₹ {drive.package_offered} LPA</p>
                )}

                {/* Meta */}
                <div className="space-y-1.5 mt-auto pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar size={13} />
                    <span>{driveDate}</span>
                  </div>
                  {drive.locations.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin size={13} />
                      <span>{drive.locations.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock size={13} />
                    <span>Created {new Date(drive.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>

                {/* View arrow */}
                <div className="flex items-center justify-end mt-4 text-primary text-xs font-semibold gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details <ChevronRight size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
