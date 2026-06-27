import { useState } from 'react';
import { Save, AlertCircle, Building2, Calendar, Clock, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DriveSettingsTabProps {
  drive: any;
  onUpdate: (updatedDrive: any) => void;
}

export default function DriveSettingsTab({ drive, onUpdate }: DriveSettingsTabProps) {
  const [formData, setFormData] = useState({
    company_name: drive.company_name || '',
    package_offered: drive.package_offered || '',
    locations: drive.locations?.join(', ') || '',
    drive_date: drive.drive_date ? drive.drive_date.substring(0, 10) : '',
    reporting_time: drive.reporting_time || '',
    venue_name: drive.venue_name || '',
    venue_maps_link: drive.venue_maps_link || '',
    form_start_date: drive.form_start_date ? drive.form_start_date.substring(0, 16) : '',
    form_end_date: drive.form_end_date ? drive.form_end_date.substring(0, 16) : '',
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setIsError(false);

    const payload = {
      ...formData,
      locations: formData.locations.split(',').map((l: string) => l.trim()).filter(Boolean),
    };

    try {
      const res = await fetch(`/api/v1/drives/${drive.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Drive settings saved successfully!');
        onUpdate(data);
      } else {
        setIsError(true);
        setMessage(data.detail || 'Failed to save settings');
      }
    } catch (err) {
      setIsError(true);
      setMessage('Network error occurred.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete this drive? This action cannot be undone and will delete all associated data.')) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/drives/${drive.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        navigate('/admin/drives');
      } else {
        alert('Failed to delete drive.');
        setDeleting(false);
      }
    } catch (err) {
      alert('Network error during deletion.');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground">Drive Configuration</h2>
          <p className="text-muted-foreground text-sm">Update general information and registration limits.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg flex items-center gap-2 font-medium ${isError ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
          <AlertCircle size={18} /> {message}
        </div>
      )}

      {/* General Settings */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Building2 size={18} className="text-primary" /> General Information
          </h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Company Name</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Package Offered (LPA)</label>
            <input
              type="text"
              value={formData.package_offered}
              onChange={(e) => setFormData({ ...formData, package_offered: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition"
              placeholder="e.g. 12.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Locations (Comma separated)</label>
            <input
              type="text"
              value={formData.locations}
              onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition"
              placeholder="e.g. Bangalore, Pune"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
              <Calendar size={16} /> Drive Date
            </label>
            <input
              type="date"
              value={formData.drive_date}
              onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
              <Clock size={16} /> Reporting Time
            </label>
            <input
              type="time"
              value={formData.reporting_time}
              onChange={(e) => setFormData({ ...formData, reporting_time: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Venue Name</label>
            <input
              type="text"
              value={formData.venue_name}
              onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition"
              placeholder="e.g. Main Auditorium, Block A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Google Maps Link</label>
            <input
              type="url"
              value={formData.venue_maps_link}
              onChange={(e) => setFormData({ ...formData, venue_maps_link: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition"
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>
        </div>
      </div>

      {/* Registration Window */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Clock size={18} className="text-blue-500" /> Registration Window
          </h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Form Start Date & Time</label>
            <input
              type="datetime-local"
              value={formData.form_start_date}
              onChange={(e) => setFormData({ ...formData, form_start_date: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Form End Date & Time</label>
            <input
              type="datetime-local"
              value={formData.form_end_date}
              onChange={(e) => setFormData({ ...formData, form_end_date: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-xl shadow-sm overflow-hidden mt-12">
        <div className="px-6 py-4 border-b border-destructive/10">
          <h3 className="font-bold text-destructive flex items-center gap-2">
            Danger Zone
          </h3>
        </div>
        <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-foreground">Delete this Drive</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Once you delete a drive, there is no going back. Please be certain. This will erase all associated registrations, rounds, and configurations.
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-destructive text-destructive-foreground font-bold rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
            Delete Drive
          </button>
        </div>
      </div>
    </div>
  );
}
