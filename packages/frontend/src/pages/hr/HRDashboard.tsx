import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Trophy, Clock, TrendingUp, ChevronRight,
  Upload, CheckCircle, XCircle, AlertCircle, Loader2,
  Calendar, MapPin, RefreshCw, Radio,
  User, Briefcase, BarChart3, FileSpreadsheet, LogOut,
  Grid3x3, Table2, Download
} from 'lucide-react';
import { GlobalOfflineBanner } from '../../components/shared/GlobalOfflineBanner';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useSocket } from '../../hooks/use-socket';

// ── Types ────────────────────────────────────────────────────────────────
interface Drive {
  _id: string;
  companyName: string;
  jobRole: string;
  ctc: string;
  eventDate: string;
  reportTime: string;
  venueDetails: { hallName: string; capacity: number };
  rounds: { type: string; label: string; status: string; order: number }[];
  status: string;
  isPaused: boolean;
  schedule: { roundType: string; startTime: string; duration: number }[];
}

interface Funnel {
  total: number;
  applied: number;
  shortlisted: number;
  attended: number;
  selected: number;
  rejected: number;
}

interface Application {
  _id: string;
  driveStudentId: string;
  referenceNumber: string;
  status: string;
  currentRound: string;
  submittedAt: string;
  data: Record<string, any>;
  assignedRoomId?: { name: string; floor: string; round: string };
}

interface Room {
  _id: string;
  name: string;
  floor: string;
  round: string;
  panelist: { name: string; expertise: string[] };
  capacity: number;
  assignedStudents: Application[];
}

// ── Helpers ───────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  applied: '#6366F1',
  shortlisted: '#8B5CF6',
  attended: '#F59E0B',
  selected: '#10B981',
  rejected: '#EF4444',
};

const STATUS_BG: Record<string, string> = {
  applied: '#EEF2FF',
  shortlisted: '#F5F3FF',
  attended: '#FFFBEB',
  selected: '#ECFDF5',
  rejected: '#FEF2F2',
};

const ROUND_LABELS: Record<string, string> = {
  aptitude: 'Aptitude',
  group_discussion: 'Group Discussion',
  gd: 'Group Discussion',
  technical_interview: 'Technical',
  hr_interview: 'HR Interview',
  hr: 'HR Interview',
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Sub-components ────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: React.ReactNode;
}) => (
  <div style={{
    background: 'white',
    border: `1px solid ${color}30`,
    borderRadius: 16,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: `0 4px 20px ${color}15`,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12,
      background: `${color}15`, display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <p style={{ fontSize: 13, color: '#64748B', fontWeight: 500, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{value.toLocaleString()}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 8,
    background: STATUS_BG[status] || '#F1F5F9',
    color: STATUS_COLORS[status] || '#64748B',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
  }}>
    {status?.replace(/_/g, ' ')}
  </span>
);

// ── Main Component ──────────────────────────────────────────────────────
export default function HRDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const socket = useSocket();

  const [tab, setTab] = useState<'overview' | 'students' | 'rooms' | 'upload'>('overview');
  const [loading, setLoading] = useState(true);
  const [drive, setDrive] = useState<Drive | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [students, setStudents] = useState<Application[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [roundType, setRoundType] = useState('');
  const [liveBar, setLiveBar] = useState<{ type: 'info' | 'success' | 'warning'; msg: string } | null>(null);
  // Track driveId so socket can join the correct room
  const driveIdRef = useRef<string | null>(null);

  // Redirect if not HR
  useEffect(() => {
    if (user && user.role !== 'company_hr') {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/hr/dashboard');
      const d = res.data.data.drive;
      setDrive(d);
      setFunnel(res.data.data.funnel);
      if (d?.rounds?.length) setRoundType(d.rounds[0].type);
      // Store driveId for socket subscription
      if (d?._id) driveIdRef.current = d._id;
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      setStudentsLoading(true);
      const res = await api.get('/hr/students', { params: { status: statusFilter, limit: 100 } });
      setStudents(res.data.data.applications || []);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  }, [statusFilter]);

  const loadRooms = useCallback(async () => {
    try {
      setRoomsLoading(true);
      const res = await api.get('/hr/rooms');
      setRooms(res.data.data || []);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (tab === 'students') loadStudents(); }, [tab, statusFilter, loadStudents]);
  useEffect(() => { if (tab === 'rooms') loadRooms(); }, [tab, loadRooms]);

  // ── Real-time socket subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    // Wait for drive to load before joining the room
    if (!driveIdRef.current && !drive?._id) return;
    const driveId = driveIdRef.current || drive?._id;
    if (!driveId) return;

    socket.emit('join:drive', driveId);

    const onStatusChanged = ({ status }: { status: string }) => {
      setDrive(prev => prev ? { ...prev, status } : prev);
      if (status === 'event_day') {
        setLiveBar({ type: 'info', msg: '🚀 Event Day is LIVE — students are checking in now' });
        toast.success('Event Day started!');
      } else if (status === 'completed') {
        setLiveBar({ type: 'success', msg: '🎉 Drive has been completed. Final selections have been submitted.' });
        toast.success('Drive completed!');
        loadDashboard();
      } else if (status === 'active') {
        setLiveBar({ type: 'info', msg: '▶️ Drive is now active — applications are open' });
      }
    };

    const onPaused = ({ isPaused }: { isPaused: boolean }) => {
      setDrive(prev => prev ? { ...prev, isPaused } : prev);
      setLiveBar({
        type: 'warning',
        msg: isPaused ? '⛔ Drive operations PAUSED by admin — invigilators are on hold' : '▶️ Drive RESUMED — operations continuing',
      });
    };

    const onRoundChanged = ({ roundType: rt, status: s }: any) => {
      // Patch the round status inline
      setDrive(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          rounds: prev.rounds.map(r => r.type === rt ? { ...r, status: s } : r),
        };
      });
      if (s === 'active') setLiveBar({ type: 'info', msg: `🔄 Round started: ${rt.replace(/_/g, ' ')}` });
      if (s === 'completed') setLiveBar({ type: 'success', msg: `✅ Round completed: ${rt.replace(/_/g, ' ')}` });
      loadDashboard();
    };

    const onShortlistUpdated = () => {
      // Refresh funnel numbers when admin uploads a shortlist
      loadDashboard();
      setLiveBar({ type: 'info', msg: '📊 Shortlist updated — refreshing pipeline counts' });
    };

    const onStudentVerified = () => {
      // Increment attended counter live without a full fetch
      setFunnel(prev => prev ? { ...prev, attended: prev.attended + 1 } : prev);
    };

    const onDriveCompleted = () => {
      setLiveBar({ type: 'success', msg: '🎉 Drive COMPLETED — results finalised' });
      loadDashboard();
    };

    socket.on('drive:status_changed', onStatusChanged);
    socket.on('drive:paused', onPaused);
    socket.on('round:status_changed', onRoundChanged);
    socket.on('drive:shortlist_updated', onShortlistUpdated);
    socket.on('student:verified', onStudentVerified);
    socket.on('drive:completed', onDriveCompleted);

    return () => {
      socket.off('drive:status_changed', onStatusChanged);
      socket.off('drive:paused', onPaused);
      socket.off('round:status_changed', onRoundChanged);
      socket.off('drive:shortlist_updated', onShortlistUpdated);
      socket.off('student:verified', onStudentVerified);
      socket.off('drive:completed', onDriveCompleted);
    };
  // Run once drive is loaded (driveId available)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drive?._id]);

  const handleUpload = async () => {
    if (!uploadFile || !roundType) return toast.error('Select a file and round type');
    const formData = new FormData();
    formData.append('file', uploadFile);
    try {
      setUploading(true);
      setUploadResult(null);
      const res = await api.post(`/hr/rounds/${roundType}/results`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(res.data.data);
      toast.success(`✅ ${res.data.data.passed} students advanced, ${res.data.data.failed} rejected`);
      loadDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 style={{ width: 36, height: 36, color: '#6366F1', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748B', fontWeight: 500 }}>Loading your drive data…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', fontFamily: "'Inter', sans-serif" }}>
      <GlobalOfflineBanner />
      {/* ── Real-time Live Bar ────────────────────────────────────────────── */}
      {liveBar && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
          background: liveBar.type === 'success' ? '#064E3B' : liveBar.type === 'warning' ? '#92400E' : '#1E1B4B',
          color: 'white', padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={14} style={{ flexShrink: 0, opacity: 0.8 }} />
            {liveBar.msg}
          </span>
          <button
            onClick={() => setLiveBar(null)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: '2px 10px', color: 'white', cursor: 'pointer', fontSize: 12 }}
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        padding: '0 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={18} color="white" />
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>
                {drive?.companyName || 'HR Portal'}
              </p>
              <p style={{ color: '#94A3B8', fontSize: 12, margin: 0 }}>{drive?.jobRole}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {drive?.isPaused && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FEF2F2', color: '#EF4444', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                <AlertCircle size={13} /> Drive Paused
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 12px' }}>
              <User size={14} color="#94A3B8" />
              <span style={{ color: '#CBD5E1', fontSize: 13 }}>{user?.name}</span>
            </div>
            <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 10, padding: '6px 12px', color: '#F87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 64, zIndex: 90 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4 }}>
          {([
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'students', label: 'Students', icon: Users },
            { id: 'rooms', label: 'Rooms', icon: Grid3x3 },
            { id: 'upload', label: 'Upload Results', icon: Upload },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 16px', border: 'none', cursor: 'pointer',
                background: 'none', fontSize: 14, fontWeight: 600,
                color: tab === t.id ? '#6366F1' : '#64748B',
                borderBottom: tab === t.id ? '2px solid #6366F1' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── OVERVIEW TAB ──────────────────────────────── */}
        {tab === 'overview' && drive && funnel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Drive Info Card */}
            <div style={{ background: 'white', borderRadius: 20, padding: 28, border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{drive.companyName}</h1>
                  <p style={{ color: '#6366F1', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>{drive.jobRole}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {[
                      { icon: Calendar, text: fmtDate(drive.eventDate) },
                      { icon: Clock, text: drive.reportTime || 'TBD' },
                      { icon: MapPin, text: drive.venueDetails?.hallName || 'Venue TBD' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <item.icon size={14} color="#6366F1" />
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '6px 14px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6,
                    background: drive.status === 'event_day' ? '#EEF2FF' : drive.status === 'active' ? '#ECFDF5' : drive.status === 'completed' ? '#F5F3FF' : '#F1F5F9',
                    color: drive.status === 'event_day' ? '#6366F1' : drive.status === 'active' ? '#10B981' : drive.status === 'completed' ? '#8B5CF6' : '#64748B',
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  }}>
                    {(drive.status === 'event_day' || drive.status === 'active') && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }} />
                    )}
                    {drive.status.replace(/_/g, ' ')}
                  </span>
                  <button onClick={loadDashboard} style={{ background: '#F1F5F9', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <RefreshCw size={14} color="#64748B" />
                  </button>
                </div>
              </div>
            </div>

            {/* Funnel Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <StatCard label="Total Applied" value={funnel.total} color="#6366F1" icon={<Table2 size={20} color="#6366F1" />} />
              <StatCard label="Shortlisted" value={funnel.shortlisted} color="#8B5CF6" icon={<CheckCircle size={20} color="#8B5CF6" />} />
              <StatCard label="Attended" value={funnel.attended} color="#F59E0B" icon={<Users size={20} color="#F59E0B" />} />
              <StatCard label="Selected" value={funnel.selected} color="#10B981" icon={<Trophy size={20} color="#10B981" />} />
              <StatCard label="Rejected" value={funnel.rejected} color="#EF4444" icon={<XCircle size={20} color="#EF4444" />} />
            </div>

            {/* Conversion Rate */}
            {funnel.total > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: 20, padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={28} color="white" />
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>Overall Conversion Rate</p>
                  <p style={{ color: 'white', fontSize: 32, fontWeight: 900, margin: 0 }}>
                    {((funnel.selected / funnel.total) * 100).toFixed(1)}%
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>
                    {funnel.selected} selected from {funnel.total} applicants
                  </p>
                </div>
              </div>
            )}

            {/* Rounds */}
            {drive.rounds.length > 0 && (
              <div style={{ background: 'white', borderRadius: 20, padding: 24, border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Interview Rounds</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {drive.rounds.map((round, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: round.status === 'active' ? '#6366F1' : round.status === 'completed' ? '#10B981' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{round.label || ROUND_LABELS[round.type] || round.type}</p>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 6,
                        background: round.status === 'active' ? '#EEF2FF' : round.status === 'completed' ? '#ECFDF5' : '#F1F5F9',
                        color: round.status === 'active' ? '#6366F1' : round.status === 'completed' ? '#10B981' : '#94A3B8',
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase'
                      }}>{round.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STUDENTS TAB ──────────────────────────────── */}
        {tab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filters */}
            <div style={{ background: 'white', borderRadius: 16, padding: '12px 20px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Filter:</span>
              {['all', 'applied', 'shortlisted', 'attended', 'selected', 'rejected'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: '1.5px solid',
                    borderColor: statusFilter === s ? '#6366F1' : '#E2E8F0',
                    background: statusFilter === s ? '#EEF2FF' : 'white',
                    color: statusFilter === s ? '#6366F1' : '#64748B',
                    textTransform: 'capitalize',
                  }}
                >{s}</button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{students.length} students</span>
                <button 
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," + 
                      ['Drive ID', 'Name', 'Branch', 'CGPA', 'Round', 'Room', 'Status'].join(',') + "\n" +
                      students.map(app => {
                        const d = app.data || {};
                        const name = (d.name || d.fullName || d.full_name || '—').replace(/,/g, '');
                        const branch = (d.branch || '—').replace(/,/g, '');
                        const cgpa = (d.cgpa || d.CGPA || '—').replace(/,/g, '');
                        const round = app.currentRound ? (ROUND_LABELS[app.currentRound] || app.currentRound) : '—';
                        const room = app.assignedRoomId?.name || '—';
                        return `${app.driveStudentId || '—'},${name},${branch},${cgpa},${round},${room},${app.status}`;
                      }).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `candidates_export_${statusFilter}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', color: '#4F46E5', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <Download size={14} /> Export CSV
                </button>
                <button onClick={loadStudents} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <RefreshCw size={12} color="#64748B" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              {studentsLoading ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <Loader2 size={28} style={{ color: '#6366F1', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                  <p style={{ color: '#64748B' }}>Loading students…</p>
                </div>
              ) : students.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <Users size={40} style={{ color: '#CBD5E1', margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ color: '#94A3B8', fontWeight: 500 }}>No students found for this filter</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        {['Drive ID', 'Name', 'Branch', 'CGPA', 'Round', 'Room', 'Status'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((app, i) => {
                        const d = app.data || {};
                        const name = d.name || d.fullName || d.full_name || '—';
                        const branch = d.branch || '—';
                        const cgpa = d.cgpa || d.CGPA || '—';
                        return (
                          <tr key={app._id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                            <td style={{ padding: '11px 16px', color: '#6366F1', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{app.driveStudentId || '—'}</td>
                            <td style={{ padding: '11px 16px', color: '#0F172A', fontWeight: 600 }}>{name}</td>
                            <td style={{ padding: '11px 16px', color: '#475569' }}>{branch}</td>
                            <td style={{ padding: '11px 16px', color: '#475569' }}>{cgpa}</td>
                            <td style={{ padding: '11px 16px', color: '#64748B', fontSize: 12 }}>{app.currentRound ? ROUND_LABELS[app.currentRound] || app.currentRound : '—'}</td>
                            <td style={{ padding: '11px 16px', color: '#64748B', fontSize: 12 }}>{app.assignedRoomId?.name || '—'}</td>
                            <td style={{ padding: '11px 16px' }}><StatusBadge status={app.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ROOMS TAB ─────────────────────────────────── */}
        {tab === 'rooms' && (
          <div>
            {roomsLoading ? (
              <div style={{ padding: 60, textAlign: 'center', background: 'white', borderRadius: 16 }}>
                <Loader2 size={28} style={{ color: '#6366F1', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              </div>
            ) : rooms.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', background: 'white', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                <Grid3x3 size={40} style={{ color: '#CBD5E1', margin: '0 auto 12px', display: 'block' }} />
                <p style={{ color: '#94A3B8', fontWeight: 500 }}>No rooms configured yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {rooms.map(room => (
                  <div key={room._id} style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                    {/* Room Header */}
                    <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #1E293B, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>{room.name}</p>
                        <p style={{ color: '#94A3B8', fontSize: 12, margin: 0 }}>{room.floor ? `Floor ${room.floor}` : ''} · {ROUND_LABELS[room.round] || room.round}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#6366F1', fontWeight: 800, fontSize: 18, margin: 0 }}>{(room.assignedStudents || []).length}</p>
                        <p style={{ color: '#64748B', fontSize: 10, margin: 0 }}>/ {room.capacity || '∞'}</p>
                      </div>
                    </div>
                    {/* Panelist */}
                    {room.panelist?.name && (
                      <div style={{ padding: '12px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={14} color="#6366F1" />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', margin: 0 }}>{room.panelist.name}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                            {(room.panelist.expertise || []).map((e, i) => (
                              <span key={i} style={{ background: '#EEF2FF', color: '#6366F1', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4 }}>{e}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Students List */}
                    <div style={{ padding: '8px 0', maxHeight: 200, overflowY: 'auto' }}>
                      {(room.assignedStudents || []).length === 0 ? (
                        <p style={{ fontSize: 12, color: '#CBD5E1', textAlign: 'center', padding: '16px 0' }}>No students assigned</p>
                      ) : (
                        (room.assignedStudents || []).map((app: any, i) => {
                          const d = app.data || {};
                          const name = d.name || d.fullName || '—';
                          const branch = d.branch || '';
                          return (
                            <div key={app._id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 20px', borderBottom: '1px solid #F8FAFC' }}>
                              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#6366F1' }}>{i + 1}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                                {branch && <p style={{ margin: 0, fontSize: 10, color: '#64748B' }}>{branch}</p>}
                              </div>
                              <StatusBadge status={app.status} />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── UPLOAD TAB ────────────────────────────────── */}
        {tab === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
            <div style={{ background: 'white', borderRadius: 20, padding: 28, border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Upload Round Results</h2>
              <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 24px' }}>
                Upload an XLSX or CSV file with columns <strong>USN</strong> or <strong>Email</strong>.
                Students in the file will <strong>advance</strong> to the next round; others will be <strong>rejected</strong>.
              </p>

              {/* Round selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Round</label>
                <select
                  value={roundType}
                  onChange={e => setRoundType(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: 'white', outline: 'none' }}
                >
                  {(drive?.rounds || []).map(r => (
                    <option key={r.type} value={r.type}>{r.label || ROUND_LABELS[r.type] || r.type}</option>
                  ))}
                </select>
              </div>

              {/* File drop zone */}
              <label
                htmlFor="hr-upload-file"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '36px 24px', borderRadius: 14,
                  border: `2px dashed ${uploadFile ? '#6366F1' : '#E2E8F0'}`,
                  background: uploadFile ? '#EEF2FF' : '#F8FAFC',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <FileSpreadsheet size={32} color={uploadFile ? '#6366F1' : '#CBD5E1'} />
                {uploadFile ? (
                  <>
                    <p style={{ margin: 0, fontWeight: 700, color: '#6366F1', fontSize: 14 }}>{uploadFile.name}</p>
                    <p style={{ margin: 0, color: '#94A3B8', fontSize: 12 }}>{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, fontWeight: 600, color: '#475569', fontSize: 14 }}>Drop your XLSX / CSV here</p>
                    <p style={{ margin: 0, color: '#94A3B8', fontSize: 12 }}>or click to browse</p>
                  </>
                )}
                <input
                  id="hr-upload-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={e => { setUploadFile(e.target.files?.[0] || null); setUploadResult(null); }}
                />
              </label>

              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                style={{
                  marginTop: 16, width: '100%', padding: '13px',
                  borderRadius: 12, border: 'none', cursor: uploadFile ? 'pointer' : 'not-allowed',
                  background: uploadFile ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#E2E8F0',
                  color: uploadFile ? 'white' : '#94A3B8',
                  fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {uploading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</> : <><Upload size={16} /> Submit Results</>}
              </button>
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Upload Result</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#ECFDF5', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={20} color="#10B981" />
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Advanced</p>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#065F46' }}>{uploadResult.passed}</p>
                    </div>
                  </div>
                  <div style={{ background: '#FEF2F2', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <XCircle size={20} color="#EF4444" />
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: '#DC2626', fontWeight: 600, textTransform: 'uppercase' }}>Rejected</p>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#991B1B' }}>{uploadResult.failed}</p>
                    </div>
                  </div>
                </div>
                {uploadResult.nextRound && uploadResult.nextRound !== 'final' && (
                  <div style={{ marginTop: 12, background: '#EEF2FF', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ChevronRight size={14} color="#6366F1" />
                    <p style={{ margin: 0, fontSize: 13, color: '#4F46E5', fontWeight: 600 }}>
                      Advanced students moved to: <strong>{ROUND_LABELS[uploadResult.nextRound] || uploadResult.nextRound}</strong>
                    </p>
                  </div>
                )}
                {uploadResult.notFound?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', margin: '0 0 6px', textTransform: 'uppercase' }}>Unmatched entries ({uploadResult.notFound.length})</p>
                    <div style={{ background: '#FFF7ED', borderRadius: 10, padding: '10px 14px', maxHeight: 120, overflowY: 'auto' }}>
                      {uploadResult.notFound.map((u: string, i: number) => (
                        <p key={i} style={{ margin: 0, fontSize: 12, color: '#92400E', fontFamily: 'monospace' }}>{u}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
