import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Clock, Trophy, MapPin, Calendar, Briefcase, Star, FileText, ExternalLink } from 'lucide-react';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

interface LookupResult {
  studentName: string;
  branch: string | null;
  status: string;
  statusLabel: string;
  driveStudentId: string | null;
  referenceNumber: string | null;
  currentRound: string | null;
  attendedAt: string | null;
  drive: {
    companyName: string;
    jobRole: string;
    ctc: string;
    status: string;
    eventDate: string | null;
    reportTime: string | null;
    venueName: string | null;
    resources?: { title: string; url: string }[];
  };
}

const statusConfig: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string; label: string }> = {
  shortlisted: {
    icon: <Star size={20} fill="currentColor" />,
    bg: '#FEF3C7', border: '#FDE68A', text: '#92400E',
    label: 'Shortlisted 🎯'
  },
  invited: {
    icon: <Calendar size={20} />,
    bg: '#EDE9FE', border: '#C4B5FD', text: '#5B21B6',
    label: 'Invited to Drive'
  },
  attended: {
    icon: <CheckCircle size={20} />,
    bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46',
    label: 'Checked In ✅'
  },
  selected: {
    icon: <Trophy size={20} />,
    bg: '#D1FAE5', border: '#34D399', text: '#065F46',
    label: 'Selected 🎉'
  },
  rejected: {
    icon: <XCircle size={20} />,
    bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B',
    label: 'Not Selected'
  },
  applied: {
    icon: <Clock size={20} />,
    bg: '#E0F2FE', border: '#7DD3FC', text: '#0C4A6E',
    label: 'Under Review'
  },
};

export default function StatusLookupPage() {
  const { driveId } = useParams<{ driveId: string }>();
  const [usn, setUsn] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState('');
  const [driveInfo, setDriveInfo] = useState<any>(null);

  // Fetch drive info on mount for the header
  React.useEffect(() => {
    fetch(`${apiBase}/event/${driveId}/info`)
      .then(r => r.json())
      .then(d => { if (d.success) setDriveInfo(d.data); })
      .catch(() => {});
  }, [driveId]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const usnClean = usn.trim().toUpperCase();
    if (!usnClean) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${apiBase}/event/${driveId}/status-lookup?usn=${encodeURIComponent(usnClean)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Could not find your application. Please check your USN.');
      } else {
        setResult(data.data);
        // Smooth scroll to result
        setTimeout(() => document.getElementById('result-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusCfg = result ? (statusConfig[result.status] || statusConfig['applied']) : null;

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '0 16px 60px',
    }}>
      {/* ── Hero Header ── */}
      <div style={{ maxWidth: 520, margin: '0 auto', paddingTop: 48, textAlign: 'center' }}>
        {/* Logo / brand */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(99,102,241,0.4)'
        }}>
          <Search size={28} color="white" />
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '0 0 6px' }}>
          Check My Status
        </h1>
        <p style={{ color: '#94A3B8', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
          Enter your USN to check your application status{driveInfo ? ` for the ${driveInfo.companyName} drive` : ''}.
        </p>

        {/* Drive info banner */}
        {driveInfo && (
          <div style={{
            marginTop: 20,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 14, padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left'
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: '#4F46E5',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Briefcase size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{driveInfo.companyName}</div>
              <div style={{ fontSize: 13, color: '#A5B4FC' }}>{driveInfo.status === 'event_day' ? '🟢 Event Day is LIVE' : driveInfo.jobRole}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Search Form ── */}
      <div style={{ maxWidth: 520, margin: '28px auto 0' }}>
        <form onSubmit={handleLookup} style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: 24,
          backdropFilter: 'blur(10px)'
        }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Your USN
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={usn}
              onChange={e => { setUsn(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError(''); setResult(null); }}
              placeholder="1RV21CS001"
              maxLength={12}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1,
                background: error ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.08)',
                border: error ? '2px solid #F87171' : '2px solid rgba(255,255,255,0.15)',
                borderRadius: 12, padding: '14px 16px',
                fontSize: 20, fontWeight: 800, fontFamily: 'monospace',
                letterSpacing: 3, color: 'white', outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={e => { e.target.style.borderColor = '#818CF8'; e.target.style.background = 'rgba(99,102,241,0.1)'; }}
              onBlur={e => { if (!error) { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.08)'; } }}
            />
            <button
              type="submit"
              disabled={loading || usn.length < 5}
              style={{
                background: (loading || usn.length < 5) ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                color: 'white', border: 'none', borderRadius: 12,
                padding: '14px 22px', fontWeight: 800, fontSize: 15,
                cursor: (loading || usn.length < 5) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                boxShadow: loading || usn.length < 5 ? 'none' : '0 4px 15px rgba(99,102,241,0.4)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <Search size={18} />
              )}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 14, background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <XCircle size={16} color="#F87171" style={{ flexShrink: 0 }} />
              <p style={{ color: '#FCA5A5', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}
        </form>
      </div>

      {/* ── Result Card ── */}
      {result && statusCfg && (
        <div id="result-card" style={{ maxWidth: 520, margin: '20px auto 0' }}>
          {/* Status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: statusCfg.bg, border: `2px solid ${statusCfg.border}`,
            borderRadius: 16, padding: '14px 20px', marginBottom: 16,
            color: statusCfg.text, fontWeight: 800, fontSize: 16
          }}>
            {statusCfg.icon}
            {statusCfg.label}
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600 }}>
              {result.branch || ''}
            </span>
          </div>

          {/* Main info card */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: 24,
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 4 }}>
              {result.studentName}
            </div>
            <div style={{ fontSize: 14, color: '#94A3B8', marginBottom: 24 }}>
              {result.drive.companyName} · {result.drive.jobRole}
              {result.drive.ctc && <span style={{ color: '#10B981', fontWeight: 700 }}> · ₹{result.drive.ctc}</span>}
            </div>

            {/* Drive ID — the most important thing on this page */}
            {result.driveStudentId && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)',
                border: '2px solid rgba(99,102,241,0.5)',
                borderRadius: 16, padding: '20px 24px', marginBottom: 20, textAlign: 'center'
              }}>
                <div style={{ fontSize: 11, color: '#A5B4FC', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Your Drive ID — Bring this to the venue
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: 'white', fontFamily: 'monospace', letterSpacing: 6 }}>
                  {result.driveStudentId}
                </div>
                <div style={{ fontSize: 12, color: '#818CF8', marginTop: 6 }}>
                  You'll need this to scan the QR & check in on event day
                </div>
              </div>
            )}

            {/* Event Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {result.drive.eventDate && (
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    <Calendar size={13} /> Event Date
                  </div>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>
                    {formatDate(result.drive.eventDate)}
                  </div>
                </div>
              )}

              {result.drive.reportTime && (
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    <Clock size={13} /> Report Time
                  </div>
                  <div style={{ color: '#FBBF24', fontSize: 18, fontWeight: 800 }}>
                    {result.drive.reportTime}
                  </div>
                </div>
              )}

              {result.drive.venueName && (
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, gridColumn: '1/-1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    <MapPin size={13} /> Venue
                  </div>
                  <div style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>
                    {result.drive.venueName}
                  </div>
                </div>
              )}
            </div>

            {/* Selected special message */}
            {result.status === 'selected' && (
              <div style={{
                marginTop: 20, background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
                borderRadius: 14, padding: '16px 20px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>Congratulations!</div>
                <div style={{ fontSize: 13, color: '#6EE7B7', marginTop: 4 }}>
                  You have been selected for {result.drive.companyName}. Contact your placement coordinator for next steps.
                </div>
              </div>
            )}

            {/* Rejected special message */}
            {result.status === 'rejected' && (
              <div style={{
                marginTop: 20, background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '16px 20px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, color: '#64748B' }}>
                  Don't be discouraged — keep applying! Your next opportunity is around the corner. 🚀
                </div>
              </div>
            )}
            {/* Prep Materials for Shortlisted/Invited */}
            {(result.status === 'shortlisted' || result.status === 'invited') && result.drive.resources && result.drive.resources.length > 0 && (
              <div style={{
                marginTop: 20, background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 16, padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#93C5FD', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                  <FileText size={16} /> Pre-Drive Preparation Materials
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.drive.resources.map((res, i) => (
                    <a key={i} href={res.url} target="_blank" rel="noreferrer" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px',
                      color: 'white', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.05)'
                    }} 
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{res.title}</span>
                      <ExternalLink size={16} color="#60A5FA" />
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Helper tip for shortlisted */}
          {(result.status === 'shortlisted' || result.status === 'invited') && result.driveStudentId && (
            <div style={{
              marginTop: 12, background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 14, padding: '14px 18px',
              display: 'flex', gap: 12, alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>📌</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FDE68A', marginBottom: 3 }}>What to bring on event day</div>
                <div style={{ fontSize: 13, color: '#FCD34D', lineHeight: 1.6 }}>
                  Your Drive ID <strong>({result.driveStudentId})</strong>, a copy of your resume, and a valid college ID card.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Passport CTA */}
      <div style={{ maxWidth: 520, margin: '20px auto 0', textAlign: 'center' }}>
        <a href="/passport" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 12, padding: '10px 20px',
          color: '#A5B4FC', fontSize: 13, fontWeight: 700, textDecoration: 'none',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
        >
          🛂 View your full placement history → CampusPool Passport
        </a>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
      `}</style>
    </div>
  );
}
