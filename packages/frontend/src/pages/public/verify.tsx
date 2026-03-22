import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

type ScreenState = 'loading' | 'expired' | 'form' | 'error_not_registered' | 'already_checked_in' | 'verifying';

const VerifyPage: React.FC = () => {
  const { driveId } = useParams<{ driveId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [screen, setScreen] = useState<ScreenState>('loading');
  const [drive, setDrive] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [checkedInAppId, setCheckedInAppId] = useState('');

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  useEffect(() => {
    // Check if token is expired client-side
    if (!token) { setScreen('expired'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) { setScreen('expired'); return; }
    } catch { setScreen('expired'); return; }

    // Fetch drive info
    fetch(`${apiBase}/event/${driveId}/info`)
      .then(r => r.json())
      .then(d => { if (d.success) setDrive(d.data); })
      .catch(() => {});

    setScreen('form');
  }, [token, driveId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    setScreen('verifying');

    try {
      const res = await fetch(`${apiBase}/event/${driveId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: form.name, email: form.email, phone: form.phone })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Store session token
        localStorage.setItem(`campuspool_session_${data.data.applicationId}`, data.data.sessionToken);
        navigate(`/event/${driveId}/welcome/${data.data.applicationId}`);
        return;
      }

      if (res.status === 401) { setScreen('expired'); return; }

      if (res.status === 409) {
        setCheckedInAppId(data.applicationId);
        setScreen('already_checked_in');
        return;
      }

      if (res.status === 404) {
        setErrorMsg(data.error || 'Not registered');
        setScreen('error_not_registered');
        return;
      }

      setErrorMsg(data.error || 'Something went wrong');
      setScreen('error_not_registered');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setScreen('form');
    }
  };

  // Common page wrapper
  const PageWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: 24
    }}>
      <div style={{ maxWidth: 440, width: '100%' }}>{children}</div>
    </div>
  );

  // === EXPIRED SCREEN ===
  if (screen === 'expired') {
    return (
      <PageWrap>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 24 }}>⚠️</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#D97706', marginBottom: 12 }}>QR Code Expired</h1>
          <p style={{ color: '#64748B', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
            This QR code has expired. Please scan the latest QR code displayed on screen.
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              background: '#6366F1', color: 'white', border: 'none',
              padding: '14px 32px', borderRadius: 12, fontSize: 16,
              fontWeight: 700, cursor: 'pointer'
            }}
          >
            ↻ Scan Again
          </button>
        </div>
      </PageWrap>
    );
  }

  // === ALREADY CHECKED IN ===
  if (screen === 'already_checked_in') {
    return (
      <PageWrap>
        <div style={{
          background: 'white', borderRadius: 20, padding: 32,
          border: '2px solid #BFDBFE', textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1E40AF', marginBottom: 8 }}>Already Checked In</h2>
          <p style={{ color: '#64748B', fontSize: 15, marginBottom: 24 }}>
            You have already checked in for this drive.
          </p>
          <button
            onClick={() => navigate(`/event/${driveId}/welcome/${checkedInAppId}`)}
            style={{
              background: '#6366F1', color: 'white', border: 'none',
              padding: '14px 32px', borderRadius: 12, fontSize: 15,
              fontWeight: 700, cursor: 'pointer', width: '100%'
            }}
          >
            Go to your dashboard →
          </button>
        </div>
      </PageWrap>
    );
  }

  // === NOT REGISTERED ===
  if (screen === 'error_not_registered') {
    return (
      <PageWrap>
        <div style={{
          background: 'white', borderRadius: 20, padding: 32,
          border: '2px solid #FECACA', textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#DC2626', marginBottom: 8 }}>Not Registered</h2>
          <p style={{ color: '#64748B', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
            {errorMsg || 'Your details were not found in our records for this drive. Please contact the placement coordinator.'}
          </p>
          <button
            onClick={() => setScreen('form')}
            style={{
              background: '#F1F5F9', color: '#475569', border: 'none',
              padding: '12px 24px', borderRadius: 12, fontSize: 15,
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            ← Try Again
          </button>
        </div>
      </PageWrap>
    );
  }

  // === LOADING / FORM ===
  return (
    <PageWrap>
      <div style={{
        background: 'white', borderRadius: 20, padding: 32,
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        border: '1px solid #E2E8F0'
      }}>
        {/* Drive info header */}
        {drive && (
          <div style={{
            background: '#EEF2FF', borderRadius: 12, padding: 16,
            marginBottom: 24, textAlign: 'center'
          }}>
            <div style={{ fontSize: 13, color: '#6366F1', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
              Campus Placement
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1E293B' }}>{drive.companyName}</div>
            <div style={{ fontSize: 14, color: '#6366F1', fontWeight: 500 }}>{drive.jobRole}</div>
          </div>
        )}

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Check In</h1>
        <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Enter your details to verify your identity and check in
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="As per college records"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: '1.5px solid #E2E8F0', fontSize: 15, fontWeight: 500,
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#6366F1'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Email Address *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="your.email@college.edu"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: '1.5px solid #E2E8F0', fontSize: 15, fontWeight: 500,
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#6366F1'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Phone Number *
            </label>
            <input
              type="tel"
              required
              pattern="[0-9]{10}"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="10-digit mobile number"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: '1.5px solid #E2E8F0', fontSize: 15, fontWeight: 500,
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#6366F1'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>

          <button
            type="submit"
            disabled={screen === 'verifying'}
            style={{
              width: '100%',
              background: screen === 'verifying' ? '#A5B4FC' : '#6366F1',
              color: 'white',
              border: 'none',
              padding: '14px 24px',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: screen === 'verifying' ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {screen === 'verifying' ? '⏳ Verifying...' : 'Check In →'}
          </button>
        </form>
      </div>
    </PageWrap>
  );
};

export default VerifyPage;
