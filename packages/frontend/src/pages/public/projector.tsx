import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users, CheckCircle, Trophy, Clock, Monitor,
  Wifi, WifiOff, TrendingUp, Zap
} from 'lucide-react';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const POLL_MS = 8000;

// ── Types ───────────────────────────────────────────────────────
interface RecentEntry {
  driveStudentId: string;
  name: string;
  usn: string;
  branch: string;
  status: string;
  currentRound: string;
  attendedAt: string;
}

interface ProjectorData {
  drive: { companyName: string; jobRole: string; status: string; eventDate: string | null; venue?: string };
  summary: { total: number; checkedIn: number; active: number; selected: number; rejected: number };
  activeRound: { type: string; label: string } | null;
  roundStats: { type: string; label: string; status: string; count: number }[];
  recentEntries: RecentEntry[];
  generatedAt: string;
}

// ── CSS ─────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }

  body { background: #030712; }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.8); }
  }
  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes glow {
    0%,100% { box-shadow: 0 0 20px rgba(99,102,241,0.3); }
    50%     { box-shadow: 0 0 40px rgba(99,102,241,0.6); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .entry-row {
    animation: fadeSlideIn 0.4s ease both;
  }
  .stat-card {
    animation: countUp 0.5s ease both;
  }
  .live-badge {
    animation: pulse-dot 1.6s ease-in-out infinite;
  }
`;

// ── Round label prettifier ────────────────────────────────────
const ROUND_LABELS: Record<string, string> = {
  ppt: 'PPT / Introductory',
  aptitude: 'Aptitude Test',
  gd: 'Group Discussion',
  technical: 'Technical Round',
  coding: 'Coding Round',
  hr: 'HR Interview',
  final: 'Final Round',
  custom: 'Custom Round',
};

const prettyRound = (type: string, label?: string) =>
  label && !ROUND_LABELS[label?.toLowerCase()] ? label : ROUND_LABELS[type] || type;

// ── Status color ──────────────────────────────────────────────
const statusStyle = (s: string) => {
  switch (s) {
    case 'selected':    return { bg: '#064E3B', text: '#6EE7B7', dot: '#10B981' };
    case 'rejected':    return { bg: '#450A0A', text: '#FCA5A5', dot: '#EF4444' };
    case 'attended':    return { bg: '#1E3A5F', text: '#93C5FD', dot: '#3B82F6' };
    case 'shortlisted': return { bg: '#2D1B69', text: '#C4B5FD', dot: '#8B5CF6' };
    default:            return { bg: '#1F2937', text: '#9CA3AF', dot: '#6B7280' };
  }
};

// ════════════════════════════════════════════════════════════════
// PROJECTOR PAGE
// ════════════════════════════════════════════════════════════════
export default function ProjectorPage() {
  const { driveId } = useParams<{ driveId: string }>();
  const [data, setData] = useState<ProjectorData | null>(null);
  const [online, setOnline] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [flashNew, setFlashNew] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${apiBase}/event/${driveId}/projector-stats`);
      const json = await res.json();
      if (json.success) {
        setData(prev => {
          if (prev && json.data.summary.checkedIn > prev.summary.checkedIn) {
            setFlashNew(true);
            setTimeout(() => setFlashNew(false), 2000);
          }
          return json.data;
        });
        setOnline(true);
        setLastRefresh(new Date());
      }
    } catch {
      setOnline(false);
    }
  };

  useEffect(() => {
    fetchStats();
    pollRef.current = setInterval(fetchStats, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [driveId]);

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, border: '4px solid rgba(99,102,241,0.3)', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
        <p style={{ color: '#4B5563', fontWeight: 700, fontSize: 18 }}>Connecting to live feed…</p>
      </div>
      <style>{styles}</style>
    </div>
  );

  const { drive, summary, activeRound, roundStats, recentEntries } = data;
  const fillPct = summary.total ? Math.round((summary.checkedIn / summary.total) * 100) : 0;

  return (
    <div style={{
      minHeight: '100vh', background: '#030712',
      fontFamily: "'Inter', sans-serif", color: 'white',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      userSelect: 'none',
    }}>
      <style>{styles}</style>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{
        padding: '20px 36px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
        borderBottom: '1px solid rgba(99,102,241,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Company info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 900,
            boxShadow: '0 0 24px rgba(99,102,241,0.5)',
            animation: 'glow 3s ease-in-out infinite',
          }}>
            {drive.companyName?.[0] || 'D'}
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, letterSpacing: -0.5 }}>
              {drive.companyName}
            </h1>
            <p style={{ fontSize: 14, color: '#8B5CF6', fontWeight: 700, marginTop: 4 }}>
              {drive.jobRole}
              {drive.venue && <span style={{ color: '#374151', fontWeight: 500 }}> · {drive.venue}</span>}
            </p>
          </div>
        </div>

        {/* Center: Active Round badge */}
        <div style={{ textAlign: 'center' }}>
          {activeRound ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: 16, padding: '10px 22px',
            }}>
              <div className="live-badge" style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366F1' }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: 1 }}>Now Active</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#A5B4FC' }}>{prettyRound(activeRound.type, activeRound.label)}</p>
              </div>
            </div>
          ) : (
            <div style={{ color: '#374151', fontSize: 14, fontWeight: 600 }}>No active round</div>
          )}
        </div>

        {/* Right: status indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Last Updated</p>
            <p style={{ fontSize: 13, color: '#6B7280', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              {lastRefresh ? formatTime(lastRefresh.toISOString()) : '—'}
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: online ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${online ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 10, padding: '6px 12px',
          }}>
            {online ? <Wifi size={14} color="#10B981" /> : <WifiOff size={14} color="#EF4444" />}
            <span style={{ fontSize: 12, fontWeight: 700, color: online ? '#10B981' : '#EF4444' }}>
              {online ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0, overflow: 'hidden' }}>

        {/* ── LEFT — Stats + Round Breakdown ─────────────── */}
        <div style={{ padding: '28px 28px 28px 36px', display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>

          {/* Big stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'REGISTERED',    value: summary.total,     icon: <Users size={20} />,      color: '#818CF8', glow: 'rgba(99,102,241,0.2)' },
              { label: 'CHECKED IN',    value: summary.checkedIn, icon: <CheckCircle size={20} />, color: '#34D399', glow: 'rgba(52,211,153,0.2)' },
              { label: 'IN PROCESS',    value: summary.active,    icon: <TrendingUp size={20} />,  color: '#FBBF24', glow: 'rgba(251,191,36,0.2)'  },
              { label: 'OFFERS OUT',    value: summary.selected,  icon: <Trophy size={20} />,      color: '#F472B6', glow: 'rgba(244,114,182,0.2)' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: '22px 20px',
                boxShadow: `inset 0 0 40px ${s.glow}`,
                animationDelay: `${i * 0.08}s`,
              }}>
                <div style={{ color: s.color, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 48, fontWeight: 900, color: 'white', lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                  {s.value}
                  {flashNew && s.label === 'CHECKED IN' && (
                    <span style={{ fontSize: 18, color: '#34D399', marginLeft: 8, animation: 'fadeSlideIn 0.3s ease' }}>↑</span>
                  )}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#374151', marginTop: 6, letterSpacing: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Check-in progress bar */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#4B5563', letterSpacing: 1, textTransform: 'uppercase' }}>
                Check-in Progress
              </span>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#6366F1', fontFamily: "'JetBrains Mono', monospace" }}>
                {fillPct}%
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 100, height: 12, overflow: 'hidden' }}>
              <div style={{
                width: `${fillPct}%`, height: '100%', borderRadius: 100,
                background: fillPct >= 80
                  ? 'linear-gradient(90deg, #10B981 0%, #6EE7B7 100%)'
                  : 'linear-gradient(90deg, #6366F1 0%, #A78BFA 100%)',
                transition: 'width 1s ease',
              }} />
            </div>
            <p style={{ fontSize: 12, color: '#374151', marginTop: 8, fontWeight: 600 }}>
              {summary.checkedIn} of {summary.total} students have checked in
            </p>
          </div>

          {/* Round breakdown */}
          {roundStats.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
                Round Breakdown
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(roundStats.length, 3)}, 1fr)`, gap: 12 }}>
                {roundStats.map((r, i) => {
                  const isActive = r.status === 'active';
                  const isDone   = r.status === 'completed';
                  return (
                    <div key={i} style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.15) 100%)'
                        : isDone
                          ? 'rgba(16,185,129,0.08)'
                          : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : isDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 16, padding: '16px 18px',
                    }}>
                      {isActive && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <div className="live-badge" style={{ width: 8, height: 8, borderRadius: '50%', background: '#818CF8' }} />
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#818CF8', textTransform: 'uppercase', letterSpacing: 1 }}>Active</span>
                        </div>
                      )}
                      {isDone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <CheckCircle size={10} color="#10B981" />
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: 1 }}>Done</span>
                        </div>
                      )}
                      <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: isActive ? '#A5B4FC' : isDone ? '#6EE7B7' : '#4B5563', fontFamily: "'JetBrains Mono', monospace" }}>
                        {r.count}
                      </div>
                      <div style={{ fontSize: 12, color: isActive ? '#818CF8' : isDone ? '#10B981' : '#374151', fontWeight: 700, marginTop: 5 }}>
                        {prettyRound(r.type, r.label)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT — Recent Check-ins ───────────────────── */}
        <div style={{
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '18px 22px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Zap size={14} color="#F59E0B" />
            <p style={{ fontSize: 12, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: 1.2 }}>
              Recent Check-ins
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {recentEntries.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Monitor size={32} color="#1F2937" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#1F2937', fontWeight: 700, fontSize: 14 }}>Waiting for check-ins…</p>
              </div>
            ) : (
              recentEntries.map((e, i) => {
                const ss = statusStyle(e.status);
                return (
                  <div key={i} className="entry-row" style={{
                    padding: '14px 22px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    animationDelay: `${i * 0.04}s`,
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'background 0.2s',
                  }}>
                    {/* Color dot */}
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ss.dot, flexShrink: 0 }} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.name}
                        </p>
                        <span style={{ fontSize: 11, color: '#374151', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                          {formatTime(e.attendedAt)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#6366F1', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>
                          {e.driveStudentId}
                        </span>
                        {e.branch && <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{e.branch}</span>}
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                          background: ss.bg, color: ss.text,
                          textTransform: 'capitalize',
                        }}>
                          {e.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom refresh indicator */}
          <div style={{
            padding: '12px 22px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Clock size={11} color="#374151" />
            <p style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>
              Auto-refreshes every {POLL_MS / 1000}s
            </p>
          </div>
        </div>
      </div>

      {/* ── TICKER BAR ─────────────────────────────────────── */}
      <div style={{
        background: '#0F0B24', borderTop: '1px solid rgba(99,102,241,0.2)',
        padding: '10px 0', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', animation: 'ticker 30s linear infinite', whiteSpace: 'nowrap' }}>
          {[...Array(2)].map((_, rep) => (
            <span key={rep} style={{ display: 'inline-flex', gap: 0 }}>
              {[
                `📋 ${summary.checkedIn} of ${summary.total} registered students have arrived`,
                activeRound ? `🎯 Current active round: ${prettyRound(activeRound.type, activeRound.label)}` : '⏳ No active round in progress',
                `✅ ${summary.selected} offer${summary.selected !== 1 ? 's' : ''} issued so far`,
                `🏢 ${drive.companyName} · ${drive.jobRole}`,
                drive.venue ? `📍 Venue: ${drive.venue}` : '',
              ].filter(Boolean).map((t, j) => (
                <span key={j} style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', padding: '0 40px' }}>
                  {t}
                  <span style={{ color: '#1F2937', marginLeft: 40 }}>·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
