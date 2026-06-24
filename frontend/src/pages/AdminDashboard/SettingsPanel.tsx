import { useState, useEffect } from 'react';
import { Save, User, Mail, MessageCircle, CalendarDays, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

interface SettingsData {
  admin_name: string;
  admin_email: string;
  system_mail_id: string;
  whatsapp_number: string;
  google_account_connected: boolean;
  google_account_email?: string;
  google_calendar_sync_enabled: boolean;
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/v1/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (err) {
      setMessage('Error occurred while saving.');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const res = await fetch('/api/v1/settings/google-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
        });
        if (res.ok) {
          const data = await res.json();
          setSettings((prev) => prev ? { ...prev, google_account_connected: true, google_account_email: data.email } : null);
        } else {
          alert('Failed to link Google account.');
        }
      } catch (err) {
        console.error('Google auth error', err);
      }
    },
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/calendar',
  });

  const disconnectGoogle = async () => {
    try {
      const res = await fetch('/api/v1/settings/google-auth/disconnect', { method: 'POST' });
      if (res.ok) {
        setSettings((prev) => prev ? { ...prev, google_account_connected: false, google_account_email: undefined, google_calendar_sync_enabled: false } : null);
      }
    } catch (err) {
      console.error('Disconnect error', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  if (!settings) return <div className="text-destructive">Failed to load settings.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground text-sm">Manage global app configurations and integrations</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      {message && (
        <div className="bg-emerald-500/10 text-emerald-600 px-4 py-3 rounded-lg flex items-center gap-2 font-medium">
          <CheckCircle2 size={18} /> {message}
        </div>
      )}

      {/* Account Settings */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <User size={18} className="text-primary" /> Admin Account
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Admin Name</label>
            <input
              type="text"
              value={settings.admin_name}
              onChange={(e) => setSettings({ ...settings, admin_name: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Admin Email</label>
            <input
              type="email"
              value={settings.admin_email}
              onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* App Communication Config */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MessageCircle size={18} className="text-emerald-500" /> System Communication
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
              <Mail size={16} /> System Outbound Mail ID
            </label>
            <input
              type="email"
              value={settings.system_mail_id}
              onChange={(e) => setSettings({ ...settings, system_mail_id: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition"
              placeholder="noreply@campuspool.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
              <MessageCircle size={16} className="text-emerald-500" /> WhatsApp Display Number
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                Live
              </span>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-input rounded-r-md text-foreground focus:ring-2 focus:ring-emerald-500 outline-none transition"
                placeholder="+1 234 567 890"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              This number will be displayed to students as the official WhatsApp contact.
            </p>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-500" /> Google Calendar Integration
          </h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="max-w-md space-y-1">
              <h3 className="font-medium text-foreground">Sync Drives to Calendar</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Automatically add placement drives to your Google Calendar when they are created, and keep dates in sync.
              </p>
            </div>
            <div className="flex-shrink-0 border border-border p-4 rounded-xl bg-background/50 flex flex-col gap-3 min-w-[260px]">
              {settings.google_account_connected ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>Connected as <b>{settings.google_account_email}</b></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Enable Auto-Sync</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.google_calendar_sync_enabled}
                        onChange={(e) => setSettings({ ...settings, google_calendar_sync_enabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <button 
                    onClick={disconnectGoogle}
                    className="text-sm text-destructive hover:underline text-left mt-2"
                  >
                    Disconnect Account
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-500/10 p-2.5 rounded-lg mb-1">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>Not connected. Sync features disabled.</span>
                  </div>
                  <button
                    onClick={() => login()}
                    className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition shadow-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" />
                    </svg>
                    Connect Google Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
