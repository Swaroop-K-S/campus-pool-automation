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

    return () => {
      socket.off('round:status_changed');
      socket.off('assignments:confirmed');
      socket.off('student:status_changed');
      socket.off('drive:paused');
      socket.off('student:selected');
      socket.off('drive:broadcast');
      socket.off('student:summoned');
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
      background: '#F8FAFC',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative',
      paddingBottom: '80px' /* Space for bottom nav */
    }} className="animate-in fade-in zoom-in-95 duration-500">

      {/* === PHASE 9: DIGITAL HALL PASS FULLSCREEN === */}
      {hallPassMode && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: assignedRoom ? getFloorColor(assignedRoom.floor) : '#94A3B8',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'white', padding: 24, textAlign: 'center'
        }} className="animate-in zoom-in duration-300" onClick={() => setHallPassMode(false)}>
          <div style={{ fontSize: 24, fontWeight: 800, opacity: 0.9, letterSpacing: 2, textTransform: 'uppercase' }}>
            {assignedRoom ? assignedRoom.floor : 'WAITING'}
          </div>
          <div style={{ fontSize: 120, fontWeight: 900, lineHeight: 1, margin: '20px 0' }}>
            {assignedRoom ? assignedRoom.name.replace(/[^0-9]/g, '') : '?'}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{student?.name?.split(' ')[0]}</div>
          <div style={{ fontSize: 18, marginTop: 10, opacity: 0.8, fontFamily: 'monospace' }}>{student?.driveStudentId}</div>
          <div style={{ position: 'absolute', bottom: 40, fontSize: 14, opacity: 0.6 }}>Tap anywhere to close</div>
        </div>
      )}

      {/* === PHASE 9: STUDENT SUMMONED OVERLAY === */}
      {summonData && !isPaused && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99000,
          background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'white', padding: 32, textAlign: 'center'
        }} className="animate-in slide-in-from-bottom duration-500">
          <div style={{ fontSize: 100, marginBottom: 20, animation: 'bounce 1s infinite' }}>🔔</div>
          <h1 style={{ fontSize: 42, fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1 }}>IT'S YOUR TURN</h1>
          <p style={{ fontSize: 24, fontWeight: 600, marginTop: 24 }}>Please enter <strong style={{ color: '#064E3B' }}>{summonData.roomName}</strong> immediately.</p>
          <button onClick={() => setSummonData(null)} style={{
            marginTop: 40, background: 'white', color: '#16A34A', border: 'none', borderRadius: 30,
            padding: '16px 40px', fontSize: 20, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
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
        background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
        padding: '32px 24px 40px',
        borderRadius: '0 0 32px 32px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Pattern overlay */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          borderRadius: '50%', transform: 'translate(30%, -30%)'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 15, color: '#C7D2FE', fontWeight: 500, marginBottom: 4 }}>
            {drive?.companyName} • {drive?.jobRole}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0' }}>
            Hello, {student?.name}! 👋
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#22C55E', padding: '6px 14px', borderRadius: 20,
              fontSize: 13, fontWeight: 700
            }}>
              ✓ Checked In
            </span>
            {student?.driveStudentId && (
              <>
                <button 
                  onClick={copyIdToClipboard}
                  className="btn-ghost text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 active:scale-95 transition-all"
                >
                  <span>ID: {student.driveStudentId}</span>
                  <Copy size={12} className="opacity-80"/>
                </button>
                <button 
                  onClick={() => setHallPassMode(true)}
                  className="text-white bg-indigo-900/40 hover:bg-indigo-900/60 px-3 py-1.5 rounded-full text-sm font-bold border border-indigo-400/30 active:scale-95 transition-all shadow-inner"
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
          margin: '24px 16px 0',
          background: 'white',
          borderRadius: 20,
          border: '2px solid #C7D2FE',
          padding: 20,
          boxShadow: '0 4px 15px rgba(99,102,241,0.08)'
        }}>
          <div style={{ fontSize: 11, color: '#6366F1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            Currently Active
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%', background: '#6366F1',
              animation: 'pulse 2s infinite', display: 'inline-block'
            }} />
            <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
              {activeRound.type.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {assignedRoom ? (
            <div style={{
              background: '#EEF2FF', borderRadius: 14, padding: 14, marginTop: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Your Room</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#4F46E5', marginTop: 2 }}>{assignedRoom.name}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{assignedRoom.floor}</div>
              </div>
              
              <button onClick={openMap} style={{
                background: 'white', border: '1px solid #C7D2FE', borderRadius: '50%',
                width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 6px rgba(99,102,241,0.1)', cursor: 'pointer', color: '#4F46E5', flexShrink: 0
              }}>
                <MapPin size={24} />
              </button>
            </div>
          ) : (
            <div style={{
              background: '#FFFBEB', borderRadius: 14, padding: 14, marginTop: 16,
              border: '1px solid #FDE68A'
            }}>
              <div style={{ fontSize: 14, color: '#92400E', fontWeight: 600 }}>
                ⏳ Room assignments will be announced soon
              </div>
              <div style={{ fontSize: 13, color: '#A16207', marginTop: 4 }}>
                Please wait in {drive?.venueDetails?.hallName || 'the main hall'}
              </div>
            </div>
          )}
          
          {/* QUEUE TRACKER UI */}
          {data?.drive?.enableQueueTracking && queueData && queueData.position !== null && queueData.position > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              borderRadius: 14, padding: 16, marginTop: 16, color: 'white',
              boxShadow: '0 4px 12px rgba(16,185,129,0.2)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1, transform: 'scale(2)' }}>
                <LifeBuoy size={100} />
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9 }}>Live Queue Position</div>
                  <div style={{ fontSize: 32, fontWeight: 900, marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    #{queueData.position}
                    <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}> / {queueData.totalRemaining}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>Estimated Wait</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{queueData.estimatedWaitTime} min</div>
                </div>
              </div>
            </div>
          )}

          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
      ) : !data.isSelected && (
        /* STANDBY — checked in, rounds not started yet */
        <div className="mx-4 mt-6 bg-warn-50 rounded-2xl border-2 border-warn-400 p-6 text-center shadow-[0_4px_15px_rgba(245,158,11,0.1)] relative overflow-hidden">
          <div className="absolute inset-0 border-2 border-warn-400 rounded-2xl animate-pulse ring-4 ring-warn-100"></div>
          <div className="text-[40px] mb-3 animate-bounce">⏳</div>
          <div className="text-warn-600 font-black text-lg mb-2 relative z-10">
            {latecomerApproved ? '✅ Entry Approved!' : 'Standby — You\'re Checked In!'}
          </div>
          <div className="text-slate-600 text-sm leading-relaxed relative z-10">
            {latecomerApproved
              ? 'Your late entry has been approved. Please proceed to your assigned room.'
              : (<>Rounds haven't started yet. Please proceed to<br />
                <strong className="text-brand-600">{drive?.venueDetails?.hallName || 'the main hall'}</strong> and wait for further instructions.</>)
            }
          </div>
          {drive?.reportTime && !latecomerApproved && (
            <div className="mt-4 bg-white rounded-xl py-2 px-4 inline-block text-[13px] font-bold text-slate-700 border border-brand-100 relative z-10 shadow-sm">
              🕘 Report by: {drive.reportTime}
            </div>
          )}
          {/* LIVE WAIT TIME PILL */}
          {estimatedWait && !latecomerApproved && (
            <div className="mt-3 relative z-10 flex justify-center">
              <div style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: 'white',
                borderRadius: 999,
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                <span style={{ width: 6, height: 6, background: 'white', borderRadius: '50%', display: 'inline-block', opacity: 0.85 }}></span>
                Est. wait: ~{estimatedWait} min
              </div>
            </div>
          )}
        </div>
      )}


      {/* === SECTION 3: Event Roadmap === */}
      <div style={{
        margin: '24px 16px 0',
        background: 'white',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        border: '1px solid #E2E8F0'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>Event Schedule</h3>

        <div style={{ position: 'relative' }}>
          {drive?.rounds?.map((round: any, i: number) => {
            const status = getRoundStatus(round);
            const isLast = i === drive.rounds.length - 1;
            const scheduleItem = drive.schedule?.find((s: any) => s.roundType === round.type);

            return (
              <div key={round.type} style={{
                display: 'flex', gap: 16, marginBottom: isLast ? 0 : 24,
                position: 'relative'
              }}>
                {/* Timeline dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                    ...(status === 'completed'
                      ? { background: '#22C55E', color: 'white' }
                      : status === 'active'
                        ? { background: '#4F46E5', color: 'white', boxShadow: '0 0 0 4px rgba(99,102,241,0.2)' }
                        : { background: '#E2E8F0', color: '#94A3B8' })
                  }}>
                    {status === 'completed' ? '✓' : status === 'active' ? '●' : (i + 1)}
                  </div>
                  {/* Connecting line */}
                  {!isLast && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 24,
                      background: status === 'completed' ? '#22C55E' : '#E2E8F0'
                    }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ paddingBottom: isLast ? 0 : 4, flex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: status === 'active' ? 700 : 500,
                    color: status === 'completed' ? '#94A3B8' : status === 'active' ? '#4F46E5' : '#334155'
                  }}>
                    {round.type.replace('_', ' ').toUpperCase()}
                  </div>
                  {scheduleItem?.startTime && (
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                      {scheduleItem.startTime} • {scheduleItem.duration} mins
                    </div>
                  )}
                  {status === 'active' && (
                    <span style={{
                      display: 'inline-block', marginTop: 6,
                      background: '#EEF2FF', color: '#4F46E5',
                      fontSize: 11, fontWeight: 700, padding: '3px 10px',
                      borderRadius: 10
                    }}>
                      ● In Progress
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* === SECTION 4: Drive Info === */}
      <div style={{
        margin: '16px 16px 32px',
        background: 'white',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-around'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Company</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{drive?.companyName}</div>
        </div>
        <div style={{ width: 1, background: '#E2E8F0' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{drive?.jobRole}</div>
        </div>
        <div style={{ width: 1, background: '#E2E8F0' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Event Date</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginTop: 4 }}>
            {drive?.eventDate ? new Date(drive.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD'}
          </div>
        </div>
      </div>

      {/* === BOTTOM MOBILE NAVIGATION === */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 z-50 p-2 flex items-center justify-around max-w-[480px] mx-auto shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-4">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center p-2 text-brand-600 transition-transform active:scale-95">
          <Home size={22} className="mb-1" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="flex flex-col items-center p-2 text-slate-400 hover:text-slate-600 transition-all active:scale-95">
          <Clock size={22} className="mb-1" />
          <span className="text-[10px] font-bold">Timeline</span>
        </button>
        <button onClick={handleSOS} className="flex flex-col items-center p-2 text-panic-500 hover:text-panic-600 transition-all active:scale-95 relative">
          <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-panic-500 animate-ping"></div>
          <LifeBuoy size={22} className="mb-1" />
          <span className="text-[10px] font-bold">SOS Help</span>
        </button>
      </div>

    </div>
  );
};

export default WelcomePage;
