import React, { useState, useEffect } from 'react';
import {
  Shield, LogIn, LogOut, Clock, CheckCircle,
  XCircle, Trophy, Star, Briefcase, Calendar,
  AlertCircle, Loader2, BookOpen, TrendingUp, Award
} from 'lucide-react';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const TOKEN_KEY = 'campuspool_passport_token';

// ── Types ────────────────────────────────────────────────────────
interface PassportProfile {
  usn: string;
  name: string;
  email: string;
  branch?: string;
  strikes?: number;
}

interface DriveHistoryItem {
  applicationId: string;
  driveStudentId: string | null;
  status: string;
  currentRound: string | null;
  submittedAt: string;
  attendedAt: string | null;
  drive: {
    _id: string;
    companyName: string;
    jobRole: string;
    ctc: string;
    eventDate: string | null;
    status: string;
  } | null;
}

interface PassportData {
  profile: PassportProfile;
  stats: {
    totalDrives: number;
    shortlisted: number;
    selected: number;
    rejected: number;
    pending: number;
  };
  driveHistory: DriveHistoryItem[];
}

// ── Status config ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  applied:    { label: 'Under Review', color: '#0369A1', bg: '#E0F2FE', icon: <Clock size={13} /> },
  shortlisted:{ label: 'Shortlisted',  color: '#92400E', bg: '#FEF3C7', icon: <Star size={13} fill="currentColor" /> },
  invited:    { label: 'Invited',       color: '#5B21B6', bg: '#EDE9FE', icon: <Calendar size={13} /> },
  attended:   { label: 'Attended',      color: '#065F46', bg: '#D1FAE5', icon: <CheckCircle size={13} /> },
  selected:   { label: 'Selected 🎉',  color: '#065F46', bg: '#D1FAE5', icon: <Trophy size={13} /> },
  rejected:   { label: 'Not Selected', color: '#991B1B', bg: '#FEE2E2', icon: <XCircle size={13} /> },
};

const getStatus = (status: string) =>
  STATUS_CONFIG[status] || STATUS_CONFIG['applied'];

// ── Animations CSS ─────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  @keyframes fadeup { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shimmer { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes pulse-ring { 0% { transform:scale(0.9); opacity:1; } 100% { transform:scale(1.4); opacity:0; } }
  .fadeup { animation: fadeup 0.5s ease both; }
  .fadeup-1 { animation-delay:0.05s; }
  .fadeup-2 { animation-delay:0.10s; }
  * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }

  @media print {
    body * { visibility: hidden; }
    #printable-resume, #printable-resume * { visibility: visible; }
    #printable-resume { position: absolute; left: 0; top: 0; width: 100%; color: black !important; background: white !important; }
    .no-print { display: none !important; }
  }
`;

// ════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [usn, setUsn] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!usn.trim() || !email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/passport/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usn: usn.trim().toUpperCase(), email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Verification failed. Please check your details.');
      } else {
        localStorage.setItem(TOKEN_KEY, data.data.passportToken);
        onLogin(data.data.passportToken);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Inter', sans-serif"
    }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-120px', left: '-120px', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />
      </div>

      <div className="fadeup" style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.3), 0 16px 48px rgba(99,102,241,0.4)',
          }}>
            <Shield size={34} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '0 0 6px' }}>CampusPool Passport</h1>
          <p style={{ color: '#94A3B8', fontSize: 14, margin: 0 }}>Your placement journey, all in one place</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24, padding: 32,
          backdropFilter: 'blur(20px)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: '0 0 4px' }}>Verify your identity</h2>
          <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 24px' }}>Use the USN and email you registered with</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                University Seat Number (USN)
              </label>
              <input
                value={usn}
                onChange={e => { setUsn(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError(''); }}
                placeholder="1RV21CS001"
                maxLength={12}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.07)',
                  border: '2px solid rgba(255,255,255,0.12)', borderRadius: 12,
                  padding: '14px 16px', fontSize: 18, fontWeight: 800,
                  fontFamily: 'monospace', letterSpacing: 3, color: 'white',
                  outline: 'none', transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.background = 'rgba(99,102,241,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Registered Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="yourname@example.com"
                autoComplete="email"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.07)',
                  border: '2px solid rgba(255,255,255,0.12)', borderRadius: 12,
                  padding: '13px 16px', fontSize: 15, color: 'white',
                  outline: 'none', transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.background = 'rgba(99,102,241,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
              />
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 20,
              }}>
                <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#FCA5A5', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || usn.length < 5 || !email.includes('@')}
              style={{
                width: '100%',
                background: (loading || usn.length < 5 || !email.includes('@'))
                  ? 'rgba(99,102,241,0.35)'
                  : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                color: 'white', border: 'none', borderRadius: 14,
                padding: '15px', fontWeight: 800, fontSize: 16,
                cursor: (loading || usn.length < 5 || !email.includes('@')) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.4)',
                transition: 'all 0.2s',
              }}
            >
              {loading
                ? <><Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> Verifying...</>
                : <><LogIn size={20} /> Access My Passport</>
              }
            </button>
          </form>

          {/* Info note */}
          <div style={{ marginTop: 20, display: 'flex', gap: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>
            <BookOpen size={14} color="#6366F1" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ color: '#64748B', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              Your <strong style={{ color: '#94A3B8' }}>CampusPool Passport</strong> is verified automatically using the details you used when applying for drives. No separate registration needed.
            </p>
          </div>
        </div>
      </div>
      <style>{globalStyles}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PROFILE DASHBOARD
// ════════════════════════════════════════════════════════════════
function ProfileDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [data, setData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Resume Builder state
  const [showResumeBuilder, setShowResumeBuilder] = useState(false);
  const [projects, setProjects] = useState<string>('');
  const [certs, setCerts] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/passport/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || 'Failed to load profile');
          if (res.status === 401) onLogout();
        } else {
          setData(json.data);
        }
      } catch {
        setError('Connection error. Please refresh.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748B', fontWeight: 600 }}>Loading your passport...</p>
      </div>
      <style>{globalStyles}</style>
    </div>
  );

  if (error) return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ textAlign: 'center', color: '#F87171' }}>
        <AlertCircle size={40} style={{ marginBottom: 12 }} />
        <p style={{ fontWeight: 700 }}>{error}</p>
        <button onClick={onLogout} style={{ marginTop: 16, padding: '10px 24px', background: '#334155', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Back to Login</button>
      </div>
      <style>{globalStyles}</style>
    </div>
  );

  const { profile, stats, driveHistory } = data!;
  const initials = profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const statCards = [
    { label: 'Drives Applied', value: stats.totalDrives, icon: <Briefcase size={18} />, color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Shortlisted', value: stats.shortlisted, icon: <Star size={18} fill="currentColor" />, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Offers Received', value: stats.selected, icon: <Trophy size={18} />, color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Pending Results', value: stats.pending, icon: <TrendingUp size={18} />, color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      fontFamily: "'Inter', sans-serif",
      padding: '0 16px 80px',
    }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-120px', left: '-120px', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
        {/* ── Header card ── */}
        <div className="fadeup" style={{
          paddingTop: 40, marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '0 0 28px 28px', padding: '36px 28px 28px',
          borderTop: 'none',
        }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={20} color="#818CF8" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#818CF8' }}>CampusPool Passport</span>
            </div>
            <button onClick={onLogout} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '7px 14px', color: '#94A3B8',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>

          {/* Profile hero */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 900, color: 'white',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}>
              {initials}
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 4px' }}>{profile.name}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#A5B4FC', fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>{profile.usn}</span>
                {profile.branch && <span style={{ fontSize: 12, color: '#64748B' }}>·</span>}
                {profile.branch && <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>{profile.branch}</span>}
                {profile.strikes !== undefined && profile.strikes > 0 && (
                  <>
                    <span style={{ fontSize: 12, color: '#64748B' }}>·</span>
                    <span style={{ fontSize: 11, color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }} title="Number of checked-in drives missed">
                       <AlertCircle size={10} /> {profile.strikes} Strike{profile.strikes > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0', fontWeight: 500 }}>{profile.email}</p>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="fadeup fadeup-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {statCards.map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18, padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: s.bg, color: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Drive History ── */}
        <div className="fadeup fadeup-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Award size={16} color="#818CF8" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'white', margin: 0 }}>Drive Applications</h2>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569', fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '3px 10px' }}>
              {driveHistory.length} total
            </span>
          </div>

          {driveHistory.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 18, padding: '48px 24px', textAlign: 'center',
            }}>
              <Briefcase size={32} color="#334155" style={{ marginBottom: 12 }} />
              <p style={{ color: '#475569', fontWeight: 600, margin: 0 }}>No drive applications found yet</p>
              <p style={{ color: '#334155', fontSize: 13, margin: '6px 0 0' }}>Apply to a placement drive to see your history here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {driveHistory.map((item, i) => {
                const status = getStatus(item.status);
                const drive = item.drive;
                return (
                  <div key={item.applicationId} className={`fadeup fadeup-${Math.min(i + 2, 4)}`} style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 18, padding: '20px',
                    transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.3)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Company + role */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                            background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15, fontWeight: 900, color: 'white',
                          }}>
                            {drive?.companyName?.[0] || '?'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {drive?.companyName || 'Unknown Company'}
                            </p>
                            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, fontWeight: 500 }}>
                              {drive?.jobRole || '—'}
                              {drive?.ctc && <span style={{ color: '#10B981', fontWeight: 700 }}> · ₹{drive.ctc}</span>}
                            </p>
                          </div>
                        </div>

                        {/* Meta row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                          {drive?.eventDate && (
                            <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={11} /> {formatDate(drive.eventDate)}
                            </span>
                          )}
                          {item.driveStudentId && (
                            <span style={{ fontSize: 11, color: '#6366F1', fontFamily: 'monospace', fontWeight: 700, background: 'rgba(99,102,241,0.1)', borderRadius: 6, padding: '2px 7px' }}>
                              ID: {item.driveStudentId}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: '#475569' }}>
                            Applied {formatDate(item.submittedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: status.bg, color: status.color,
                        borderRadius: 10, padding: '6px 12px',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {status.icon}
                        {status.label}
                      </div>
                    </div>

                    {/* Selected celebration */}
                    {item.status === 'selected' && (
                      <div style={{
                        marginTop: 14, background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.15) 100%)',
                        borderRadius: 12, padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: 8,
                        border: '1px solid rgba(16,185,129,0.2)',
                      }}>
                        <Trophy size={16} color="#10B981" />
                        <span style={{ fontSize: 13, color: '#6EE7B7', fontWeight: 700 }}>
                          🎉 Congratulations! You were selected for this drive.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── ATS Resume Generator ── */}
        <div className="fadeup fadeup-3 no-print" style={{ marginTop: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 24 }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
               <h3 style={{ fontSize: 16, fontWeight: 800, color: 'white', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}><LogOut size={16} /> Resume Generator</h3>
               <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>Generate a 1-click ATS-friendly PDF Resume</p>
             </div>
             <button onClick={() => setShowResumeBuilder(!showResumeBuilder)} style={{ padding: '8px 16px', borderRadius: 10, background: '#6366F1', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                {showResumeBuilder ? 'Close Builder' : 'Open Builder'}
             </button>
           </div>
           
           {showResumeBuilder && (
             <div style={{ marginTop: 24, borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 20 }}>
               <div style={{ marginBottom: 16 }}>
                 <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Projects (Bullet Points)</label>
                 <textarea value={projects} onChange={e => setProjects(e.target.value)} placeholder="- Built a placement automation system using Node.js" rows={3} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, color: 'white', fontSize: 14 }} />
               </div>
               <div style={{ marginBottom: 16 }}>
                 <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Certifications</label>
                 <textarea value={certs} onChange={e => setCerts(e.target.value)} placeholder="- AWS Certified Solutions Architect" rows={3} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, color: 'white', fontSize: 14 }} />
               </div>
               <button onClick={() => window.print()} style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#10B981', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Generate PDF Resume</button>
             </div>
           )}
        </div>

        {/* Hidden Printable Resume */}
        <div id="printable-resume" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -100, background: 'white', padding: '40px', color: 'black', fontFamily: 'Arial, sans-serif' }}>
           <h1 style={{ textAlign: 'center', fontSize: 24, fontWeight: 'bold', margin: '0 0 4px', color: 'black' }}>{profile.name}</h1>
           <p style={{ textAlign: 'center', fontSize: 14, margin: '0 0 20px', color: '#444' }}>{profile.email} | {profile.usn} | {profile.branch || 'Student'}</p>
           
           <h2 style={{ fontSize: 14, fontWeight: 'bold', borderBottom: '1px solid #ccc', textTransform: 'uppercase', paddingBottom: 4, marginBottom: 10, color: 'black' }}>Education Options & Metrics</h2>
           <ul style={{ fontSize: 12, margin: '0 0 20px', paddingLeft: 20 }}>
             <li><strong>University Seat Number:</strong> {profile.usn}</li>
             <li><strong>Branch:</strong> {profile.branch || 'Not Specified'}</li>
             <li><strong>Extracurricular Strikes:</strong> {profile.strikes || 0}</li>
           </ul>

           {projects && (
             <>
               <h2 style={{ fontSize: 14, fontWeight: 'bold', borderBottom: '1px solid #ccc', textTransform: 'uppercase', paddingBottom: 4, marginBottom: 10, color: 'black' }}>Projects</h2>
               <div style={{ fontSize: 12, margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>{projects}</div>
             </>
           )}

           {certs && (
             <>
               <h2 style={{ fontSize: 14, fontWeight: 'bold', borderBottom: '1px solid #ccc', textTransform: 'uppercase', paddingBottom: 4, marginBottom: 10, color: 'black' }}>Certifications</h2>
               <div style={{ fontSize: 12, margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>{certs}</div>
             </>
           )}
        </div>

        {/* Footer */}
        <div className="fadeup fadeup-4 no-print" style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ color: '#1E293B', fontSize: 12, fontWeight: 600 }}>CampusPool Passport · Secured with JWT</p>
        </div>
      </div>

      <style>{globalStyles}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROOT PAGE — manages auth state
// ════════════════════════════════════════════════════════════════
export default function PassportPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const handleLogin = (t: string) => {
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;
  return <ProfileDashboard token={token} onLogout={handleLogout} />;
}
