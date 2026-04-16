import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/use-socket';
import { LifeBuoy, MapPin, Clock, Home, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

const WelcomePage: React.FC = () => {
  const { driveId, appId } = useParams<{ driveId: string; appId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);
  const [studentStatus, setStudentStatus] = useState<string>('');
  const [queueData, setQueueData] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [latecomerApproved, setLatecomerApproved] = useState(false);

  // Derived: estimated wait time in minutes
  const estimatedWait = queueData?.position && queueData.position > 0
    ? Math.max(1, Math.round(queueData.position * (queueData.avgMinutesPerSlot || 5)))
    : null;

  // Phase 9 States
  const [broadcastData, setBroadcastData] = useState<any | null>(null);
  const [summonData, setSummonData] = useState<any | null>(null);
  const [hallPassMode, setHallPassMode] = useState(false);
  // Drive completed overlay
  const [driveCompleted, setDriveCompleted] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  const sessionToken = localStorage.getItem(`campuspool_session_${appId}`);

  const fetchWelcomeData = useCallback(async () => {
    if (!sessionToken) { navigate(`/event/${driveId}/verify`); return; }
    try {
      const res = await fetch(`${apiBase}/event/${driveId}/welcome/${appId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      if (res.status === 401) { navigate(`/event/${driveId}/verify`); return; }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setStudentStatus(json.data?.status || '');
        setIsPaused(json.data?.drive?.isPaused || false);
        if (json.data.isSelected) {
          setShowCongrats(true);
          setTimeout(() => {
            confetti({ particleCount: 100, spread: 70, origin: { x: 0, y: 1 }, angle: 60, colors: ['#6366F1', '#8B5CF6', '#FFFFFF', '#10B981'], zIndex: 1000 });
            confetti({ particleCount: 100, spread: 70, origin: { x: 1, y: 1 }, angle: 120, colors: ['#6366F1', '#8B5CF6', '#FFFFFF', '#10B981'], zIndex: 1000 });
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
          }, 300);
        }
      }
    } catch {}
    setLoading(false);
  }, [appId, driveId, sessionToken]);

  useEffect(() => {
    fetchWelcomeData();
    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }).catch(() => {});
    }
  }, [fetchWelcomeData]);

  // Queue Polling
  useEffect(() => {
    if (!driveId || !appId || !sessionToken || !data?.drive?.enableQueueTracking || !data?.activeRound || isPaused) return;
    
    const fetchQueue = async () => {
      try {
        const res = await fetch(`${apiBase}/event/${driveId}/queue/${appId}`, {
          headers: { Authorization: `Bearer ${sessionToken}` }
        });
        const json = await res.json();
        if (json.success) setQueueData(json.data);
      } catch {}
    };

    fetchQueue();
    const intv = setInterval(fetchQueue, 15000);
    return () => clearInterval(intv);
  }, [driveId, appId, sessionToken, data?.drive?.enableQueueTracking, data?.activeRound, isPaused]);

  useEffect(() => {
    socket.emit('join:drive', driveId);
    socket.emit('join:app', appId);

    const fireConfetti = () => {
      confetti({ particleCount: 100, spread: 70, origin: { x: 0, y: 1 }, angle: 60, colors: ['#6366F1', '#8B5CF6', '#FFFFFF', '#10B981'], zIndex: 1000 });
      confetti({ particleCount: 100, spread: 70, origin: { x: 1, y: 1 }, angle: 120, colors: ['#6366F1', '#8B5CF6', '#FFFFFF', '#10B981'], zIndex: 1000 });
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    };

    socket.on('round:status_changed', () => fetchWelcomeData());
    socket.on('assignments:confirmed', () => fetchWelcomeData());
    socket.on('student:status_changed', (d: any) => {
      fetchWelcomeData();
      // Handle admin latecomer approval
      if (d?.status === 'attended' && d?.message?.includes('approved')) {
        setLatecomerApproved(true);
        toast.success('✅ Admin approved your entry! You may proceed.', { duration: 8000 });
      }
    });
    socket.on('drive:paused', (d: any) => setIsPaused(d.isPaused));
    socket.on('student:selected', (d: any) => {
      if (d.applicationId === appId) {
        setStudentStatus('selected');
        setShowCongrats(true);
        fireConfetti();
      }
    });

    // Phase 9 Listeners
    socket.on('drive:broadcast', (d: any) => {
      setBroadcastData(d);
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
    });
    socket.on('student:summoned', (d: any) => {
      setSummonData(d);
      if ('vibrate' in navigator) navigator.vibrate([500, 200, 500, 200, 500]);
    });

    // Drive completed — show a full-screen overlay to all students
    socket.on('drive:completed', () => {
      setDriveCompleted(true);
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    });

    // Room assigned without reload (after rotation)
    socket.on('student:room_assigned', (_d: any) => {
      fetchWelcomeData();
    });

    return () => {
      socket.off('round:status_changed');
      socket.off('assignments:confirmed');
      socket.off('student:status_changed');
      socket.off('drive:paused');
      socket.off('student:selected');
      socket.off('drive:broadcast');
      socket.off('student:summoned');
      socket.off('drive:completed');
      socket.off('student:room_assigned');
    };
  }, [driveId, appId]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F8FAFC',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ color: '#6366F1', fontWeight: 600 }}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { student, drive, assignedRoom, activeRound } = data;

  // ─── REJECTED STATE ───
  const isRejected = studentStatus === 'rejected' || data.status === 'rejected';

  if (isRejected) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        fontFamily: "'Inter','Segoe UI',sans-serif",
        maxWidth: 480, margin: '0 auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center'
      }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>💙</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', marginBottom: 8 }}>Thank you for your effort</h1>
        <p style={{ color: '#94A3B8', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
          We appreciate you participating in the <strong style={{ color: '#C7D2FE' }}>{drive?.companyName}</strong> placement drive.
          Unfortunately, you haven't been selected to advance at this time.
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 24, width: '100%'
        }}>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>Drive</div>
          <div style={{ fontWeight: 800, color: 'white' }}>{drive?.companyName} — {drive?.jobRole}</div>
        </div>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 24, width: '100%'
        }}>
          <p style={{ color: '#FCA5A5', fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>
            Please silently collect your belongings and exit the premises so the remaining rounds can proceed without interruption.
          </p>
        </div>
        <p style={{ color: '#475569', fontSize: 12 }}>
          Thank you for your cooperation and best of luck in your future endeavors.
        </p>
      </div>
    );
  }

  const handleSOS = () => {
    socket.emit('student:sos', { applicationId: appId, driveId, studentName: student.name, room: assignedRoom?.name || 'Waiting Area' });
    alert("Volunteer pinged! Please stay where you are, help is on the way.");
  };

  const openMap = () => {
    alert("Interactive Campus Map opening... (Placeholder)");
  };

  const copyIdToClipboard = () => {
    if (student?.driveStudentId) {
      navigator.clipboard.writeText(student.driveStudentId);
      toast.success("Temp ID copied to clipboard!");
      if ('vibrate' in navigator) navigator.vibrate(50);
    }
  };

  const getRoundStatus = (round: any) => {
    if (round.status === 'completed') return 'completed';
    if (round.status === 'active') return 'active';
    return 'pending';
  };

  // Phase 9 Hall Pass Color Logic
  const getFloorColor = (floor: string) => {
    const f = floor?.toLowerCase() || '';
    if (f.includes('ground') || f.includes('0')) return '#3B82F6'; // Blue
    if (f.includes('1st') || f.includes('first')) return '#22C55E'; // Green
    if (f.includes('2nd') || f.includes('second')) return '#EAB308'; // Yellow
    if (f.includes('3rd') || f.includes('third')) return '#A855F7'; // Purple
    if (f.includes('4th') || f.includes('fourth')) return '#EC4899'; // Pink
    return '#F97316'; // Orange default
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative',
      paddingBottom: '80px', /* Space for bottom nav */
      overflowX: 'hidden'
    }} className="animate-in fade-in zoom-in-95 duration-500 text-white">

      {/* Decorative Background Orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '-30%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* All subsequent content must have a relative z-index to sit above orbs */}
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* === DRIVE COMPLETED OVERLAY === */}
      {driveCompleted && !showCongrats && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 32, textAlign: 'center'
        }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🏁</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: 'white', marginBottom: 8 }}>Drive Concluded</h1>
          <p style={{ color: '#94A3B8', fontSize: 16, lineHeight: 1.7, maxWidth: 360 }}>
            The <strong style={{ color: '#E0E7FF' }}>selection process is now complete</strong>. Results will be announced by the college placement cell shortly.
          </p>
          <div style={{
            marginTop: 32, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '20px 24px', width: '100%', maxWidth: 340
          }}>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 8 }}>Drive</p>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{data?.drive?.companyName} — {data?.drive?.jobRole}</p>
          </div>
          <p style={{ color: '#475569', fontSize: 12, marginTop: 32, lineHeight: 1.8 }}>
            Thank you for your patience and professionalism.
            Please collect your belongings and proceed to the exit in an orderly manner.
          </p>
        </div>
      )}

      {/* === PHASE 9: DIGITAL HALL PASS FULLSCREEN === */}
      {hallPassMode && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: assignedRoom ? getFloorColor(assignedRoom.floor) : '#94A3B8',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'white', padding: 24, textAlign: 'center',
          boxShadow: 'inset 0 0 150px rgba(0,0,0,0.5)'
        }} className="animate-in zoom-in duration-300" onClick={() => setHallPassMode(false)}>
          <div style={{
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255,255,255,0.3)', borderRadius: 32,
            padding: '40px 24px', width: '100%', maxWidth: 360,
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: 20, fontWeight: 900, opacity: 0.9, letterSpacing: 3, textTransform: 'uppercase' }}>
              {assignedRoom ? assignedRoom.floor : 'WAITING'}
            </div>
            <div style={{ fontSize: 130, fontWeight: 900, lineHeight: 1, margin: '20px 0', textShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
              {assignedRoom ? assignedRoom.name.replace(/[^0-9]/g, '') : '?'}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{student?.name?.split(' ')[0]}</div>
            <div style={{ fontSize: 18, marginTop: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', letterSpacing: 2 }}>
              {student?.driveStudentId}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 40, fontSize: 14, opacity: 0.6, letterSpacing: 1, fontWeight: 600 }}>Tap anywhere to close</div>
        </div>
      )}

      {/* === PHASE 9: STUDENT SUMMONED OVERLAY === */}
      {summonData && !isPaused && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99000,
          background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'white', padding: 32, textAlign: 'center',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3)'
        }} className="animate-in slide-in-from-bottom duration-500">
          <div style={{ fontSize: 120, marginBottom: 20, animation: 'bounce 1s infinite', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}>🔔</div>
          <h1 style={{ fontSize: 48, fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, textShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>IT'S YOUR TURN</h1>
          <p style={{ fontSize: 24, fontWeight: 600, marginTop: 24, color: '#D1FAE5' }}>Please enter</p>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px 32px', borderRadius: 20, marginTop: 12, border: '2px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)' }}>
            <strong style={{ color: 'white', fontSize: 36, letterSpacing: -1 }}>{summonData.roomName}</strong>
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, marginTop: 16, color: '#D1FAE5' }}>immediately.</p>
          <button onClick={() => setSummonData(null)} style={{
            marginTop: 48, background: 'white', color: '#059669', border: 'none', borderRadius: 30,
            padding: '18px 48px', fontSize: 20, fontWeight: 900, cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)', transition: 'transform 0.1s'
          }} className="active:scale-95">
            I'M GOING IN
          </button>
        </div>
      )}

      {/* === PHASE 9: MASS BROADCAST TOAST === */}
      {broadcastData && (
        <div style={{
          position: 'fixed', top: 20, left: 20, right: 20, zIndex: 88000,
          background: 'rgba(15, 23, 42, 0.95)', border: '2px solid #38BDF8',
          backdropFilter: 'blur(10px)', borderRadius: 20, padding: 24, color: 'white',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }} className="animate-in slide-in-from-top duration-300 shadow-2xl">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ background: '#38BDF8', color: '#0F172A', padding: '4px 8px', borderRadius: 8, fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>ADMIN MSG</div>
            <div style={{ flex: 1, fontSize: 12, color: '#94A3B8' }}>Just now</div>
            <button onClick={() => setBroadcastData(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 24, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.5 }}>
            {broadcastData.message}
          </div>
        </div>
      )}

      {/* === MASTER PAUSE OVERLAY === */}
      {isPaused && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 32, textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 24, animation: 'pulse 2s infinite' }}>🚦</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 12 }}>Operations Suspended</h1>
          <p style={{ color: '#94A3B8', fontSize: 15, lineHeight: 1.6 }}>
            The placement drive has been temporarily paused by the administrators. 
            All queue tracking and scanning are disabled. 
            <br/><br/>
            <strong style={{ color: '#FCD34D' }}>Please hold your current position and wait for further instructions.</strong>
          </p>
        </div>
      )}

      {/* === CONGRATULATIONS OVERLAY === */}
      {showCongrats && !isPaused && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 30%, #7C3AED 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 32
        }}>
          <div style={{ fontSize: 96, animation: 'bounce 1s infinite' }}>🎉</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: 'white', marginTop: 24, textAlign: 'center' }}>CONGRATULATIONS!</h1>
          <p style={{ fontSize: 22, color: '#C7D2FE', marginTop: 8, fontWeight: 600 }}>{student.name}</p>
          <p style={{ color: '#E0E7FF', marginTop: 24, fontSize: 16 }}>You have been selected by</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'white', marginTop: 4 }}>{drive.companyName}</p>
          <p style={{ color: '#C7D2FE', fontSize: 16, marginTop: 4 }}>for the role of <strong>{drive.jobRole}</strong></p>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', margin: '32px 0', width: 200 }} />
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', marginTop: '24px', textAlign: 'left', width: '100%' }}>
            <p style={{ color: '#E0E7FF', fontSize: 15, fontWeight: 700, marginBottom: '12px' }}>Mandatory Next Steps:</p>
            <ul style={{ color: '#C7D2FE', fontSize: 14, margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
              <li style={{ marginBottom: 6 }}>Please remain quiet to not disturb other ongoing rounds.</li>
              <li style={{ marginBottom: 6 }}>Wait in the designated area for the HR Coordinator.</li>
              <li>Have your digital documents ready for final verification.</li>
            </ul>
          </div>
          <button
            onClick={() => setShowCongrats(false)}
            style={{
              marginTop: 32, background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12,
              padding: '12px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer'
            }}
          >
            View Dashboard
          </button>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }`}</style>
        </div>
      )}

      {/* === SECTION 1: Welcome Banner === */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79,70,229,0.3) 0%, rgba(99,102,241,0.1) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '36px 24px 44px',
        borderRadius: '0 0 36px 36px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        {/* Pattern overlay */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 250, height: 250,
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
          borderRadius: '50%', transform: 'translate(20%, -20%)'
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 13, color: '#A5B4FC', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Live Connection</span>
          </div>
          
          <div style={{ fontSize: 14, color: '#E0E7FF', fontWeight: 500, marginBottom: 4, opacity: 0.9 }}>
            {drive?.companyName} • {drive?.jobRole}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '4px 0 16px', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            Hello, {student?.name?.split(' ')[0]}! 👋
          </h1>
          
          <div className="flex flex-wrap items-center gap-3 w-full">
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
              padding: '8px 16px', borderRadius: 12,
              fontSize: 13, fontWeight: 800, color: 'white',
              boxShadow: '0 4px 15px rgba(34,197,94,0.3)'
            }}>
              ✓ Checked In
            </span>
            {student?.driveStudentId && (
              <>
                <button 
                  onClick={copyIdToClipboard}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-all outline-none border border-white/20"
                >
                  <span className="font-mono tracking-wider">ID: {student.driveStudentId}</span>
                  <Copy size={14} className="opacity-70"/>
                </button>
                <button 
                  onClick={() => setHallPassMode(true)}
                  className="bg-indigo-500/30 hover:bg-indigo-500/50 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold border border-indigo-400/40 active:scale-95 transition-all flex items-center gap-2"
                >
                  Hall Pass 🪄
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* === SECTION 2: Current Round OR Standby === */}
      {activeRound ? (
        <div style={{
          margin: '24px 20px 0',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.1)',
          padding: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontSize: 12, color: '#818CF8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818CF8', boxShadow: '0 0 10px #818CF8', animation: 'pulse 2s infinite' }} />
            Currently Active
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'white', marginTop: 8, letterSpacing: -0.5 }}>
            {activeRound.type.replace('_', ' ').toUpperCase()}
          </div>

          {assignedRoom ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)',
              borderRadius: 16, padding: 20, marginTop: 20,
              border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#A5B4FC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Your Assigned Room</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'white', marginTop: 4, letterSpacing: -1 }}>{assignedRoom.name}</div>
                <div style={{ fontSize: 14, color: '#C7D2FE', marginTop: 2, fontWeight: 500 }}>{assignedRoom.floor}</div>
              </div>
              
              <button onClick={openMap} style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                width: 54, height: 54, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)', cursor: 'pointer', color: 'white', flexShrink: 0,
                transition: 'all 0.2s'
              }} className="active:scale-95 hover:bg-white/20">
                <MapPin size={24} />
              </button>
            </div>
          ) : (
            <div style={{
              background: 'rgba(245,158,11,0.1)', borderRadius: 16, padding: 18, marginTop: 20,
              border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 14, alignItems: 'flex-start'
            }}>
              <Clock style={{ flexShrink: 0, color: '#FCD34D', marginTop: 2 }} size={24} />
              <div>
                <div style={{ fontSize: 15, color: '#FDE68A', fontWeight: 700, lineHeight: 1.3 }}>
                  Room assignments soon
                </div>
                <div style={{ fontSize: 14, color: '#D97706', marginTop: 6, lineHeight: 1.4 }}>
                  Please wait in <strong style={{ color: '#FCD34D' }}>{drive?.venueDetails?.hallName || 'the main hall'}</strong>. You will be summoned when it is your turn.
                </div>
              </div>
            </div>
          )}

          {/* QUEUE TRACKER UI — uses dedicated queue endpoint OR welcome data EWT */}
          {(() => {
            const pos   = (queueData?.position != null && queueData.position > 0) ? queueData.position : data?.queuePosition;
            const wait  = queueData?.estimatedWaitTime != null ? queueData.estimatedWaitTime : data?.estimatedWaitMinutes;
            const total = queueData?.totalRemaining ?? null;
            if (!pos || pos <= 0) return null;
            return (
              <div style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                borderRadius: 16, padding: 20, marginTop: 16, color: 'white',
                boxShadow: '0 8px 24px rgba(16,185,129,0.25)', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1, transform: 'scale(2) rotate(-15deg)' }}>
                  <LifeBuoy size={120} />
                </div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9 }}>Live Queue Position</div>
                    <div style={{ fontSize: 36, fontWeight: 900, marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 6, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                      #{pos}
                      {total != null && <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.8 }}>/ {total}</span>}
                    </div>
                  </div>
                  {wait != null && (
                    <div style={{ textAlign: 'right', background: 'rgba(0,0,0,0.15)', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>Estimated Wait</div>
                      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                        {wait === 0 ? 'Your turn!' : `~${wait} min`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
      ) : !data.isSelected && (
        /* STANDBY — checked in, rounds not started yet */
        <div className="mx-5 mt-6 bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-3xl"></div>
          <div className="text-[48px] mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">⏳</div>
          <div className="text-white font-black text-2xl mb-3 relative z-10 tracking-tight">
            {latecomerApproved ? '✅ Entry Approved!' : 'You\'re Checked In!'}
          </div>
          <div className="text-slate-300 text-[15px] leading-relaxed relative z-10 mb-6">
            {latecomerApproved
              ? 'Your late entry has been approved. Please proceed to your assigned room.'
              : (<>Rounds haven't started yet. Please proceed to<br />
                <strong className="text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md mx-1">{drive?.venueDetails?.hallName || 'the main hall'}</strong> and relax.</>)
            }
          </div>
          {drive?.reportTime && !latecomerApproved && (
            <div className="bg-slate-900/60 rounded-xl py-3 px-5 inline-flex items-center gap-2 text-sm font-bold text-slate-200 border border-slate-700 relative z-10 shadow-inner">
              <Clock size={16} className="text-indigo-400" /> Report by: {drive.reportTime}
            </div>
          )}
          {/* LIVE WAIT TIME PILL */}
          {estimatedWait && !latecomerApproved && (
            <div className="mt-5 relative z-10 flex justify-center">
              <div style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: 'white',
                borderRadius: 999,
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 15px rgba(245,158,11,0.4)',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                <span style={{ width: 8, height: 8, background: 'white', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 10px white' }}></span>
                Est. wait: ~{estimatedWait} min
              </div>
            </div>
          )}
        </div>
      )}


      {/* === SECTION 3: Event Roadmap === */}
      <div style={{
        margin: '24px 20px 0',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)',
        borderRadius: 24,
        padding: '24px 24px 8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 6, background: 'rgba(99,102,241,0.2)', borderRadius: 8, color: '#818CF8' }}><Clock size={18} /></div>
          Event Roadmap
        </h3>

        <div style={{ position: 'relative' }}>
          {drive?.rounds?.map((round: any, i: number) => {
            const status = getRoundStatus(round);
            const isLast = i === drive.rounds.length - 1;
            const scheduleItem = drive.schedule?.find((s: any) => s.roundType === round.type);

            return (
              <div key={round.type} style={{
                display: 'flex', gap: 20, marginBottom: isLast ? 0 : 32,
                position: 'relative'
              }}>
                {/* Timeline dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, flexShrink: 0, transition: 'all 0.3s ease',
                    ...(status === 'completed'
                      ? { background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', color: 'white', boxShadow: '0 4px 15px rgba(34,197,94,0.4)' }
                      : status === 'active'
                        ? { background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: 'white', boxShadow: '0 0 0 4px rgba(99,102,241,0.3), 0 4px 20px rgba(99,102,241,0.5)' }
                        : { background: 'rgba(255,255,255,0.05)', color: '#64748B', border: '1px solid rgba(255,255,255,0.1)' })
                  }}>
                    {status === 'completed' ? '✓' : status === 'active' ? '●' : (i + 1)}
                  </div>
                  {/* Connecting line */}
                  {!isLast && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 32, margin: '8px 0',
                      background: status === 'completed' ? 'linear-gradient(to bottom, #22C55E, rgba(34,197,94,0.3))' : 'rgba(255,255,255,0.05)'
                    }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ paddingBottom: isLast ? 24 : 8, flex: 1, marginTop: 4 }}>
                  <div style={{
                    fontSize: 17,
                    fontWeight: status === 'active' ? 800 : 600,
                    color: status === 'completed' ? '#94A3B8' : status === 'active' ? 'white' : '#64748B',
                    letterSpacing: -0.3
                  }}>
                    {round.type.replace('_', ' ').toUpperCase()}
                  </div>
                  {scheduleItem?.startTime && (
                    <div style={{ fontSize: 13, color: status === 'completed' ? '#64748B' : '#94A3B8', marginTop: 4, fontWeight: 500 }}>
                      {scheduleItem.startTime} • {scheduleItem.duration} mins
                    </div>
                  )}
                  {status === 'active' && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                      background: 'rgba(99,102,241,0.15)', color: '#A5B4FC',
                      fontSize: 12, fontWeight: 700, padding: '4px 12px',
                      borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)'
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818CF8', animation: 'pulse 1.5s infinite' }} />
                      In Progress
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* === SECTION 4: Drive Info === */}
      <div style={{
        margin: '20px 20px 40px',
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(10px)',
        borderRadius: 24,
        padding: 24,
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-around',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Company</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginTop: 6 }}>{drive?.companyName}</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginTop: 6 }}>{drive?.jobRole}</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginTop: 6 }}>
            {drive?.eventDate ? new Date(drive.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD'}
          </div>
        </div>
      </div>

      {/* === BOTTOM MOBILE NAVIGATION === */}
      </div> {/* Closes the relative zIndex 1 container */}
      
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        zIndex: 50, padding: '12px 16px 24px',
        maxWidth: 480, margin: '0 auto',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center'
      }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center p-2 text-indigo-400 transition-transform active:scale-95 outline-none">
          <Home size={24} className="mb-1" strokeWidth={2.5} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="flex flex-col items-center p-2 text-slate-400 hover:text-indigo-300 transition-all active:scale-95 outline-none">
          <Clock size={24} className="mb-1" strokeWidth={2} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Roadmap</span>
        </button>
        <button onClick={handleSOS} className="flex flex-col items-center p-2 text-rose-500 hover:text-rose-400 transition-all active:scale-95 relative outline-none">
          <div className="absolute top-1 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
          <LifeBuoy size={24} className="mb-1" strokeWidth={2.5} />
          <span className="text-[10px] font-bold uppercase tracking-wider">SOS Help</span>
        </button>
      </div>

    </div>
  );
};

export default WelcomePage;
