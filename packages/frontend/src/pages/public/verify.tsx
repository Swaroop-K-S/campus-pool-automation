import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, RefreshCw, GraduationCap, Clock } from 'lucide-react';

const VerifyPage: React.FC = () => {
  const { driveId } = useParams<{ driveId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [driveIdInput, setDriveIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenExpired, setTokenExpired] = useState(false);
  const [drive, setDrive] = useState<any>(null);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  useEffect(() => {
    if (!token) { setTokenExpired(true); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) { setTokenExpired(true); return; }
    } catch { setTokenExpired(true); return; }

    fetch(`${apiBase}/event/${driveId}/info`)
      .then(r => r.json())
      .then(d => { if (d.success) setDrive(d.data); })
      .catch(() => {});
  }, [token, driveId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = driveIdInput.trim().toUpperCase();
    if (!id) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBase}/event/${driveId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, driveStudentId: id })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed');
        if (data.code === 'QR_EXPIRED') setTokenExpired(true);
        return;
      }

      // Store session token
      localStorage.setItem(`campuspool_session_${data.data.applicationId}`, data.data.sessionToken);
      navigate(`/event/${driveId}/welcome/${data.data.applicationId}`);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // TOKEN EXPIRED SCREEN
  if (tokenExpired) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 16 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
          <div style={{ width: 64, height: 64, background: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Clock size={32} color="#D97706" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>QR Code Expired</h2>
          <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            This QR code has expired. Please scan the <strong>latest QR code</strong> displayed on the venue screen.
          </p>
          <button
            onClick={() => window.history.back()}
            style={{ width: '100%', background: '#F59E0B', color: 'white', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <RefreshCw size={15} /> Scan Again
          </button>
        </div>
      </div>
    );
  }

  // MAIN VERIFY SCREEN
  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Drive info header */}
        {drive && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, background: '#4F46E5', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <GraduationCap size={28} color="white" />
            </div>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>{drive.companyName}</h1>
            <p style={{ color: '#94A3B8', fontSize: 14, margin: 0 }}>{drive.jobRole} • Campus Drive</p>
          </div>
        )}

        {/* ID Entry Card */}
        <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
          <div style={{ background: '#4F46E5', padding: '16px 24px' }}>
            <h2 style={{ color: 'white', fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>Event Check-In</h2>
            <p style={{ color: '#C7D2FE', fontSize: 14, margin: 0 }}>Enter your Drive ID to check in</p>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Your Drive ID</label>

              <input
                value={driveIdInput}
                onChange={e => {
                  setError('');
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                  setDriveIdInput(val);
                }}
                placeholder="CP-INF26-7382"
                maxLength={15}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: error ? '2px solid #F87171' : '2px solid #E2E8F0',
                  borderRadius: 12, padding: '16px 12px',
                  textAlign: 'center', fontSize: 24, fontWeight: 900,
                  fontFamily: 'monospace', letterSpacing: 3,
                  color: '#1E293B', background: error ? '#FEF2F2' : '#F8FAFC',
                  outline: 'none', transition: 'all 0.2s'
                }}
                onFocus={e => { if (!error) e.target.style.borderColor = '#818CF8'; e.target.style.background = 'white'; }}
                onBlur={e => { if (!error) e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; }}
              />

              {error && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 12 }}>
                  <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>
                </div>
              )}

              <p style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                Found in your confirmation email and on your application page
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || driveIdInput.length < 5}
              style={{
                width: '100%', background: (loading || driveIdInput.length < 5) ? '#A5B4FC' : '#4F46E5',
                color: 'white', border: 'none', borderRadius: 12,
                padding: '16px 24px', fontSize: 16, fontWeight: 800,
                cursor: (loading || driveIdInput.length < 5) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Verifying...
                </>
              ) : (
                <>Check In <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#64748B', fontSize: 12, marginTop: 16 }}>
          Can't find your ID? Contact the placement coordinator at the registration desk.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default VerifyPage;
