import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: '', address: '', contactEmail: '' });
  const [smtp, setSmtp] = useState({ host: '', port: 587, user: '', pass: '' });
  const [twilio, setTwilio] = useState({ accountSid: '', authToken: '', fromNumber: '' });
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);

  useEffect(() => {
    document.title = 'Settings — CampusPool';
    api.get('/college/profile').then((d: any) => {
      if (d.success && d.data) {
        setProfile({ name: d.data.name || '', address: d.data.address || '', contactEmail: d.data.contactEmail || '' });
        if (d.data.smtpConfig) setSmtp(d.data.smtpConfig);
        if (d.data.twilioConfig) setTwilio(d.data.twilioConfig);
      }
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    try {
      const d: any = await api.put('/college/profile', profile);
      if (d.success) toast.success('Profile saved!');
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Error saving profile'); }
  };

  const saveSmtp = async () => {
    try {
      const d: any = await api.put('/college/smtp', smtp);
      if (d.success) toast.success('SMTP config saved!');
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Error saving SMTP'); }
  };

  const saveTwilio = async () => {
    try {
      const d: any = await api.put('/college/twilio', twilio);
      if (d.success) toast.success('Twilio config saved!');
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Error saving Twilio config'); }
  };

  const changePassword = async () => {
    if (pw.newPw !== pw.confirm) { toast.error('Passwords do not match'); return; }
    if (pw.newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    try {
      const d: any = await api.post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.newPw });
      if (d.success) { toast.success('Password updated!'); setPw({ current: '', newPw: '', confirm: '' }); }
      else toast.error(d.error || 'Failed');
    } catch { toast.error('Error changing password'); }
  };

  const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";
  const btnClass = "bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>

      {/* CARD 1 — College Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">College Profile</h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>College Name</label>
            <input className={inputClass} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Demo College of Engineering" />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <textarea className={inputClass + " min-h-[80px] resize-none"} value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} placeholder="Bangalore, Karnataka" />
          </div>
          <div>
            <label className={labelClass}>Event Contact Email</label>
            <input className={inputClass} type="email" value={profile.contactEmail} onChange={e => setProfile({ ...profile, contactEmail: e.target.value })} placeholder="placement@college.edu" />
          </div>
          <button onClick={saveProfile} className={btnClass}>Save Profile</button>
        </div>
      </div>

      {/* CARD 2 — SMTP Config */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Email (SMTP) Configuration</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>SMTP Host</label>
            <input className={inputClass} value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label className={labelClass}>SMTP Port</label>
            <input className={inputClass} type="number" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: Number(e.target.value) })} placeholder="587" />
          </div>
          <div>
            <label className={labelClass}>Email Username</label>
            <input className={inputClass} value={smtp.user} onChange={e => setSmtp({ ...smtp, user: e.target.value })} placeholder="noreply@college.edu" />
          </div>
          <div>
            <label className={labelClass}>Email Password</label>
            <div className="relative">
              <input className={inputClass + " pr-10"} type={showSmtpPass ? 'text' : 'password'} value={smtp.pass} onChange={e => setSmtp({ ...smtp, pass: e.target.value })} />
              <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <button onClick={saveSmtp} className={btnClass}>Save SMTP</button>
      </div>

      {/* CARD 3 — Twilio Config */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">WhatsApp (Twilio) Configuration</h3>
        <div className="space-y-4 mb-4">
          <div>
            <label className={labelClass}>Account SID</label>
            <input className={inputClass} value={twilio.accountSid} onChange={e => setTwilio({ ...twilio, accountSid: e.target.value })} placeholder="AC..." />
          </div>
          <div>
            <label className={labelClass}>Auth Token</label>
            <div className="relative">
              <input className={inputClass + " pr-10"} type={showTwilioToken ? 'text' : 'password'} value={twilio.authToken} onChange={e => setTwilio({ ...twilio, authToken: e.target.value })} />
              <button type="button" onClick={() => setShowTwilioToken(!showTwilioToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showTwilioToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>WhatsApp Number</label>
            <input className={inputClass} value={twilio.fromNumber} onChange={e => setTwilio({ ...twilio, fromNumber: e.target.value })} placeholder="whatsapp:+14155238886" />
          </div>
        </div>
        <button onClick={saveTwilio} className={btnClass}>Save Twilio</button>
      </div>

      {/* CARD 4 — Change Password */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Change Password</h3>
        <div className="space-y-4 mb-4">
          <div>
            <label className={labelClass}>Current Password</label>
            <input className={inputClass} type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <input className={inputClass} type="password" value={pw.newPw} onChange={e => setPw({ ...pw, newPw: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input className={inputClass} type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />
          </div>
        </div>
        <button onClick={changePassword} className={btnClass}>Update Password</button>
      </div>
    </div>
  );
}
