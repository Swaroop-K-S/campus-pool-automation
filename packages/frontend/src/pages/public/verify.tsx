import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, RefreshCw, GraduationCap, Clock, Camera, Flashlight, SwitchCamera, Keyboard } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';

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
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [latecomerHold, setLatecomerHold] = useState<{appId: string; name: string} | null>(null);

  // Scanner State
  const [useCamera, setUseCamera] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraAccess, setCameraAccess] = useState<boolean | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user'|'environment'>('environment');
  const [scanVfx, setScanVfx] = useState<'none' | 'success' | 'warn'>('none');
  const [isProcessingQR, setIsProcessingQR] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  // Audio Context for beep
  const playBeep = (type: 'success' | 'warn') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // high note
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
      } else {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime); // low note
        oscillator.frequency.setValueAtTime(250, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch {}
    
    // Haptics
    if (navigator.vibrate) {
      if (type === 'success') navigator.vibrate([100]);
      else navigator.vibrate([50, 100, 50]);
    }
  };

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
      
    return () => {
      stopScanner();
    };
  }, [token, driveId]);

  // Handle HTML5 QR
  useEffect(() => {
    if (useCamera && !tokenExpired) {
      startScanner();
    } else {
      stopScanner();
    }
  }, [useCamera, facingMode, tokenExpired]);

  const startScanner = async () => {
    try {
      if (scannerRef.current) await scannerRef.current.stop().catch(()=>{});
      setCameraAccess(null);
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: facingMode },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (!isProcessingQR) {
            handleScanSuccess(decodedText);
          }
        },
        () => { /* Handle scan error (ignore) */ }
      );
      setCameraAccess(true);
      // We can only reliably check flashlight after start
      html5QrCode.applyVideoConstraints({ advanced: [{ torch: isFlashOn }] } as any).catch(() => setIsFlashOn(false));
    } catch (err: any) {
      console.log('Scanner error:', err);
      setCameraAccess(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {});
      } catch (err) {
        // html5-qrcode throws synchronously if stopped when not running
      }
      try {
        scannerRef.current.clear();
      } catch (err) {}
      scannerRef.current = null;
    }
  };

  const toggleFlash = async () => {
    if (!scannerRef.current) return;
    const newState = !isFlashOn;
    try {
      await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: newState }] } as any);
      setIsFlashOn(newState);
    } catch {
      toast.error("Flashlight not supported on this device/browser");
    }
  };

  const handleScanSuccess = async (scannedId: string) => {
    if (isProcessingQR) return;
    setIsProcessingQR(true);
    setDriveIdInput(scannedId);
    
    // Auto submit
    await verifyId(scannedId);
  };

  const verifyId = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBase}/event/${driveId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, driveStudentId: id.trim().toUpperCase() })
      });
      const data = await res.json();

      // Handle LATECOMER_HOLD (res.ok is false but data still has session)
      if (data.code === 'LATECOMER_HOLD' && data.data?.sessionToken) {
        localStorage.setItem(`campuspool_session_${data.data.applicationId}`, data.data.sessionToken);
        setScanVfx('warn');
        playBeep('warn');
        setLatecomerHold({ appId: data.data.applicationId, name: data.data.studentName });
        setTimeout(() => setScanVfx('none'), 800);
        setIsProcessingQR(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Verification failed');
        if (data.code === 'QR_EXPIRED') setTokenExpired(true);
        setTimeout(() => setIsProcessingQR(false), 2000);
        return;
      }

      // Store session token
      localStorage.setItem(`campuspool_session_${data.data.applicationId}`, data.data.sessionToken);

      if (data.data.alreadyCheckedIn) {
        setScanVfx('warn');
        playBeep('warn');
        setAlreadyCheckedIn(true);
        setTimeout(() => {
          setScanVfx('none');
          navigate(`/event/${driveId}/welcome/${data.data.applicationId}`);
        }, 2200);
      } else {
        setScanVfx('success');
        playBeep('success');
        setTimeout(() => {
          setScanVfx('none');
          navigate(`/event/${driveId}/welcome/${data.data.applicationId}`);
        }, 200);
      }
    } catch {
      setError('Connection error. Please try again.');
      setTimeout(() => setIsProcessingQR(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyId(driveIdInput);
  };

  // LATECOMER HOLD SCREEN
  if (latecomerHold) {
    return (
      <div style={{ minHeight: '100vh', background: '#78350F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 16 }}>
        <div style={{ background: 'white', borderRadius: 24, padding: 36, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
          <div style={{ width: 80, height: 80, background: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '4px solid #F59E0B', animation: 'pulse-reticle 2s ease-in-out infinite' }}>
            <Clock size={40} color="#D97706" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#92400E', marginBottom: 8 }}>⏳ Latecomer Hold</h2>
          <p style={{ color: '#78350F', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Hi, {latecomerHold.name}!</p>
          <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            You arrived after the 30-minute reporting window.<br/>
            <strong>Please wait until an admin approves your entry.</strong>
          </p>
          <div style={{ background: '#FEF3C7', border: '2px solid #F59E0B', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ color: '#92400E', fontSize: 13, fontWeight: 600, margin: 0 }}>📋 Show this screen to the placement coordinator to request override.</p>
          </div>
          <button
            onClick={() => navigate(`/event/${driveId}/welcome/${latecomerHold.appId}`)}
            style={{ width: '100%', background: '#F59E0B', color: 'white', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            View My Dashboard
          </button>
        </div>
        <style>{`@keyframes pulse-reticle { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
      </div>
    );
  }

  // ALREADY CHECKED IN SCREEN
  if (alreadyCheckedIn) {
    return (
      <div style={{ minHeight: '100vh', background: scanVfx === 'warn' ? '#F59E0B' : '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 16, transition: 'background 0.2s ease-out' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', transform: scanVfx === 'warn' ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
          <div style={{ width: 72, height: 72, background: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={36} color="#D97706" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>Already Checked In</h2>
          <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6, marginBottom: 6 }}>
            Welcome back, <strong>{drive?.companyName || 'drive participant'}</strong>!
          </p>
          <p style={{ color: '#94A3B8', fontSize: 13 }}>Returning to your dashboard...</p>
          <div style={{ marginTop: 20, height: 4, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: '#F59E0B', borderRadius: 4, animation: 'shrink 2.2s linear forwards' }} />
          </div>
        </div>
        <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
      </div>
    );
  }

  // VFX FLASH OVERLAY
  const vfxOverlay = scanVfx === 'success' ? (
    <div style={{ position: 'fixed', inset: 0, background: '#10B981', zIndex: 9999, opacity: 1, pointerEvents: 'none', animation: 'fadeOut 0.3s ease forwards' }} />
  ) : null;

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
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {vfxOverlay}
      
      {/* Header */}
      {drive && (
        <div style={{ width: '100%', background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, position: 'sticky', top: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: '#4F46E5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={20} color="white" />
            </div>
            <div>
              <h1 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>{drive.companyName}</h1>
              <p style={{ color: '#94A3B8', fontSize: 12, margin: 0 }}>Volunteer Scanner</p>
            </div>
          </div>
          <button 
            onClick={() => setUseCamera(!useCamera)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            {useCamera ? <><Keyboard size={14} /> Manual</> : <><Camera size={14} /> Scanner</>}
          </button>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 420, padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {useCamera ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#1E293B', borderRadius: 24, overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', height: '100%', minHeight: 400, border: '1px solid #334155' }}>
              {/* Scanner Video */}
              <div id="qr-reader" style={{ width: '100%', height: '100%', background: 'black' }} />
              
              {/* Animated HUD Reticle Overlay */}
              {cameraAccess && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 250, height: 250, position: 'relative' }}>
                    {/* Corners */}
                    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, animation: 'pulse-reticle 2s infinite' }}>
                      <path d="M 0 50 L 0 0 L 50 0 M 200 0 L 250 0 L 250 50 M 250 200 L 250 250 L 200 250 M 50 250 L 0 250 L 0 200" fill="none" stroke="#6366F1" strokeWidth="4" />
                    </svg>
                    {/* Scanning Bar */}
                    <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'rgba(99, 102, 241, 0.8)', boxShadow: '0 0 10px #6366F1', animation: 'scan-line 2s linear infinite' }} />
                  </div>
                  
                  {/* Floating Action Buttons */}
                  <div style={{ position: 'absolute', bottom: 24, display: 'flex', gap: 16, pointerEvents: 'auto' }}>
                    <button onClick={toggleFlash} style={{ width: 48, height: 48, borderRadius: '50%', background: isFlashOn ? 'white' : 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}>
                      <Flashlight size={20} color={isFlashOn ? '#0F172A' : 'white'} />
                    </button>
                    <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}>
                      <SwitchCamera size={20} color="white" />
                    </button>
                  </div>
                </div>
              )}

              {/* Status Message */}
              <div style={{ position: 'absolute', top: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ background: isProcessingQR ? 'rgba(245, 158, 11, 0.9)' : 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(8px)', padding: '8px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isProcessingQR ? (
                    <><div style={{ width: 12, height: 12, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/> Verifying Student...</>
                  ) : (
                    <>Scan Student QR</>
                  )}
                </div>
              </div>

              {/* Verified Today Counter */}
              <div style={{ position: 'absolute', top: 24, right: 16 }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.9)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: 16, color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ width: 6, height: 6, background: 'white', borderRadius: '50%', animation: 'pulse-reticle 2s infinite' }} />
                  {drive?.stats?.verifiedCount || 0} Verified Today
                </div>
              </div>
            </div>
            
            <style>{`
              #qr-reader__scan_region { background: black !important; }
              #qr-reader__dashboard { display: none !important; } 
              #qr-reader-results { display: none !important; }
              #qr-reader video { object-fit: cover; }
            `}</style>
          </div>
        ) : (
          /* Manual ID Entry Card */
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden', marginTop: 32 }}>
            <div style={{ background: '#4F46E5', padding: '16px 24px' }}>
              <h2 style={{ color: 'white', fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>Manual Entry</h2>
              <p style={{ color: '#C7D2FE', fontSize: 14, margin: 0 }}>Enter Student Drive ID</p>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
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
                  <><div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Verifying...</>
                ) : (
                  <>Check In Manual <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes pulse-reticle { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }
        @keyframes scan-line { 0% { top: 0%; } 50% { top: 100%; opacity: 1; } 51% { opacity: 0; } 100% { top: 0%; opacity: 0; } }
      `}</style>
    </div>
  );
};

export default VerifyPage;
