import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../hooks/use-socket';

const QRDisplayPage: React.FC = () => {
  const { driveId } = useParams<{ driveId: string }>();
  const socket = useSocket();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [drive, setDrive] = useState<any>(null);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

    // Fetch current QR via REST immediately (don't wait for Socket.io)
    fetch(`${apiBase}/event/${driveId}/qr/current`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.qrDataUrl) {
          setQrDataUrl(data.data.qrDataUrl);
          const secondsLeft = Math.floor((data.data.expiresAt - Date.now()) / 1000);
          setTimeLeft(Math.max(0, secondsLeft));
        }
      })
      .catch(() => {});

    // Also join socket room for live updates
    socket.emit('join:drive:qr', driveId);
    socket.on('qr:rotate', ({ qrDataUrl, expiresAt }: any) => {
      setQrDataUrl(qrDataUrl);
      const secondsLeft = Math.floor((expiresAt - Date.now()) / 1000);
      setTimeLeft(secondsLeft);
    });

    // Fetch drive info for display
    fetch(`${apiBase}/event/${driveId}/info`)
      .then(r => r.json())
      .then(d => { if (d.success) setDrive(d.data); })
      .catch(() => {});

    return () => { socket.off('qr:rotate'); };
  }, [driveId]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const progress = timeLeft / 30;
  const circumference = 2 * Math.PI * 200;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        borderRadius: '50%'
      }} />

      {/* Header */}
      <div style={{ color: '#64748B', fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600, position: 'relative', zIndex: 1 }}>
        Campus Placement Drive
      </div>

      {/* Company Name */}
      <div style={{ color: 'white', fontSize: 36, fontWeight: 800, marginBottom: 6, position: 'relative', zIndex: 1 }}>
        {drive?.companyName || 'Loading...'}
      </div>
      <div style={{ color: '#818CF8', fontSize: 18, fontWeight: 500, marginBottom: 48, position: 'relative', zIndex: 1 }}>
        {drive?.jobRole}
      </div>

      {/* QR Code with countdown ring */}
      <div style={{ position: 'relative', marginBottom: 32, zIndex: 1 }}>
        {/* Countdown SVG ring */}
        <svg width="440" height="440" style={{ position: 'absolute', top: -20, left: -20 }}>
          {/* Background ring */}
          <circle cx="220" cy="220" r="200" fill="none" stroke="#1E293B" strokeWidth="6" />
          {/* Progress ring */}
          <circle
            cx="220" cy="220" r="200"
            fill="none"
            stroke={timeLeft > 10 ? '#6366F1' : timeLeft > 5 ? '#F59E0B' : '#EF4444'}
            strokeWidth="6"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${circumference * (1 - progress)}`}
            strokeLinecap="round"
            transform="rotate(-90 220 220)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
          />
        </svg>

        {/* QR Code */}
        <div style={{
          background: 'white',
          padding: 24,
          borderRadius: 20,
          width: 400, height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
        }}>
          {qrDataUrl ? (
            <img src={qrDataUrl} width={352} height={352} style={{ borderRadius: 12, transition: 'opacity 0.4s ease' }} alt="QR Code" />
          ) : (
            <div style={{
              background: '#1E293B',
              width: 320, height: 320,
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #334155'
            }}>
              <div style={{
                width: 40, height: 40,
                border: '3px solid #6366F1',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: 16
              }}/>
              <p style={{ color: '#64748B', fontSize: 14, textAlign: 'center', padding: '0 16px', margin: '0 0 8px' }}>
                Waiting for admin to start QR rotation...
              </p>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>
                Start from the admin panel
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Countdown badge */}
      <div style={{
        background: 'rgba(99,102,241,0.15)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 24,
        padding: '8px 20px',
        marginBottom: 24,
        position: 'relative', zIndex: 1
      }}>
        <span style={{
          color: timeLeft > 10 ? '#818CF8' : timeLeft > 5 ? '#F59E0B' : '#EF4444',
          fontSize: 15, fontWeight: 700
        }}>
          Refreshes in {timeLeft}s
        </span>
      </div>

      {/* Instructions */}
      <div style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 8, position: 'relative', zIndex: 1 }}>
        Scan to Check In
      </div>
      <div style={{ color: '#64748B', fontSize: 15, position: 'relative', zIndex: 1 }}>
        Use your phone camera to scan the QR code above
      </div>

      {/* Footer date */}
      <div style={{
        position: 'absolute', bottom: 32,
        color: '#334155', fontSize: 13, fontWeight: 500
      }}>
        {drive?.eventDate
          ? new Date(drive.eventDate).toLocaleDateString('en-IN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })
          : ''}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default QRDisplayPage;
