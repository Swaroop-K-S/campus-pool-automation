import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/use-socket';
import confetti from 'canvas-confetti';

const WelcomePage: React.FC = () => {
  const { driveId, appId } = useParams<{ driveId: string; appId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);

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
        if (json.data.isSelected) {
          setShowCongrats(true);
          setTimeout(() => confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 }, colors: ['#6366F1', '#8B5CF6', '#FFFFFF', '#10B981'] }), 300);
        }
      }
    } catch {}
    setLoading(false);
  }, [appId, driveId, sessionToken]);

  useEffect(() => {
    fetchWelcomeData();
  }, [fetchWelcomeData]);

  useEffect(() => {
    socket.emit('join:drive', driveId);
    socket.emit('join:app', appId);

    socket.on('round:status_changed', () => fetchWelcomeData());
    socket.on('assignments:confirmed', () => fetchWelcomeData());
    socket.on('student:selected', (d: any) => {
      if (d.applicationId === appId) {
        setShowCongrats(true);
        confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 }, colors: ['#6366F1', '#8B5CF6', '#FFFFFF', '#10B981'] });
      }
    });

    return () => {
      socket.off('round:status_changed');
      socket.off('assignments:confirmed');
      socket.off('student:selected');
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

  const getRoundStatus = (round: any) => {
    if (round.status === 'completed') return 'completed';
    if (round.status === 'active') return 'active';
    return 'pending';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* === CONGRATULATIONS OVERLAY === */}
      {showCongrats && (
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
          <p style={{ color: '#C7D2FE', fontSize: 14 }}>HR will contact you within 5 business days</p>
          <p style={{ color: '#A5B4FC', fontSize: 13, marginTop: 6 }}>Check your email for further instructions</p>
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
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#22C55E', padding: '6px 14px', borderRadius: 20,
            fontSize: 13, fontWeight: 700, marginTop: 8
          }}>
            ✓ Checked In
          </span>
        </div>
      </div>

      {/* === SECTION 2: Current Round === */}
      {activeRound && (
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
              background: '#EEF2FF', borderRadius: 14, padding: 14, marginTop: 16
            }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Your Room</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4F46E5', marginTop: 2 }}>{assignedRoom.name}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{assignedRoom.floor}</div>
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
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
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
    </div>
  );
};

export default WelcomePage;
