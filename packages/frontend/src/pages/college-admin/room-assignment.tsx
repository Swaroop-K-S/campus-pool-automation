import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface StudentChip {
  _id: string;
  name: string;
  branch: string;
}

interface AssignmentRoom {
  roomId: string;
  roomName: string;
  studentIds: string[];
  students: StudentChip[];
  matchScore: number;
  matchReason: string;
}

export default function RoomAssignmentPage() {
  const { driveId } = useParams<{ driveId: string }>();
  const navigate = useNavigate();

  const [roundType, setRoundType] = useState('aptitude');
  const [assignments, setAssignments] = useState<AssignmentRoom[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [matchQuality, setMatchQuality] = useState<number | null>(null);
  const [loading, setLoading] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const [drive, setDrive] = useState<any>(null);
  const [loadedDrive, setLoadedDrive] = useState(false);

  // Load drive info on first render
  React.useEffect(() => {
    if (!loadedDrive) {
      api.get(`/drives/${driveId}`).then((d: any) => {
        if (d.success) setDrive(d.data);
        setLoadedDrive(true);
      });
    }
  }, [driveId, loadedDrive]);

  const rounds = drive?.rounds || [];

  const handleAutoAssign = useCallback(async () => {
    setLoading('random');
    setMatchQuality(null);
    try {
      const data: any = await api.post(`/drives/${driveId}/rooms/auto-assign/${roundType}`);
      if (data.success) {
        setAssignments(data.data.assignments);
        setTotalStudents(data.data.totalStudents);
        setConfirmed(false);
        toast.success('Random assignment generated!');
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch { toast.error('Network error'); }
    setLoading('');
  }, [driveId, roundType]);

  const handleAISuggest = useCallback(async () => {
    setLoading('ai');
    try {
      const data: any = await api.post(`/drives/${driveId}/rooms/ai-suggest/${roundType}`);
      if (data.success) {
        setAssignments(data.data.assignments);
        setTotalStudents(data.data.totalStudents);
        setMatchQuality(data.data.overallMatchQuality);
        setConfirmed(false);
        toast.success('AI suggestions generated!');
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch { toast.error('Network error'); }
    setLoading('');
  }, [driveId, roundType]);

  const handleConfirm = useCallback(async () => {
    setLoading('confirm');
    try {
      const payload = {
        roundType,
        assignments: assignments.map(a => ({
          roomId: a.roomId,
          studentIds: a.studentIds
        }))
      };
      const data: any = await api.post(`/drives/${driveId}/rooms/confirm-assignments`, payload);
      if (data.success) {
        setConfirmed(true);
        toast.success(`${data.data.totalAssigned} students assigned!`);
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch { toast.error('Network error'); }
    setLoading('');
  }, [driveId, roundType, assignments]);

  // Move student between rooms (manual drag simulation via click)
  const moveStudent = (studentId: string, fromRoomId: string, toRoomId: string) => {
    setAssignments(prev => prev.map(a => {
      if (a.roomId === fromRoomId) {
        return { ...a, studentIds: a.studentIds.filter(id => id !== studentId), students: a.students.filter(s => s._id !== studentId) };
      }
      if (a.roomId === toRoomId) {
        const fromRoom = prev.find(r => r.roomId === fromRoomId);
        const student = fromRoom?.students.find(s => s._id === studentId);
        if (student) {
          return { ...a, studentIds: [...a.studentIds, studentId], students: [...a.students, student] };
        }
      }
      return a;
    }));
  };

  const qualityColor = matchQuality !== null
    ? matchQuality >= 80 ? 'bg-green-100 text-green-700 border-green-300'
    : matchQuality >= 50 ? 'bg-amber-100 text-amber-700 border-amber-300'
    : 'bg-red-100 text-red-700 border-red-300'
    : '';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/admin/drives/${driveId}`)}
          className="text-slate-400 hover:text-slate-600 text-xl">←</button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Room Assignment</h1>
          <p className="text-sm text-slate-500">{drive?.companyName} — {drive?.jobRole}</p>
        </div>
      </div>

      {/* Round selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center gap-4 flex-wrap">
        <label className="text-sm font-bold text-slate-600 uppercase tracking-wider">Round:</label>
        <div className="flex gap-2">
          {rounds.map((r: any) => (
            <button key={r.type} onClick={() => setRoundType(r.type)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                roundType === r.type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {r.type.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-3 items-center">
          <button onClick={handleAutoAssign} disabled={!!loading}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">
            {loading === 'random' ? '⏳' : '🎲'} Auto Assign
          </button>
          <button onClick={handleAISuggest} disabled={!!loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">
            {loading === 'ai' ? '⏳' : '✨'} AI Suggest
          </button>

          {matchQuality !== null && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${qualityColor}`}>
              Match Quality: {matchQuality}%
            </span>
          )}

          <button onClick={handleConfirm} disabled={assignments.length === 0 || confirmed || !!loading}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">
            {loading === 'confirm' ? '⏳' : '✓'} Confirm Assignments
          </button>
        </div>
      </div>

      {/* Summary */}
      {assignments.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 flex gap-6 text-sm">
          <span><strong className="text-indigo-700">{totalStudents}</strong> students</span>
          <span><strong className="text-indigo-700">{assignments.length}</strong> rooms</span>
          <span>Assigned: <strong className="text-green-700">
            {assignments.reduce((s, a) => s + a.studentIds.length, 0)}
          </strong></span>
          {confirmed && <span className="text-green-600 font-bold ml-auto">✓ Confirmed & Saved</span>}
        </div>
      )}

      {/* Assignment Grid */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="text-5xl mb-4">🏫</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Assignments Yet</h3>
          <p className="text-slate-500 text-sm">Select a round and click "Auto Assign" or "AI Suggest" to generate room assignments</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((room) => {
            const capacityPercent = Math.min(100, (room.studentIds.length / 30) * 100); // default cap 30
            const isOverCapacity = room.studentIds.length > 30;
            return (
              <div key={room.roomId}
                className={`bg-white rounded-xl p-5 border-2 transition-colors ${
                  room.matchScore > 70 ? 'border-indigo-300' :
                  isOverCapacity ? 'border-red-300' : 'border-slate-200'
                }`}>
                {/* Room Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800">{room.roomName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.matchScore > 50 && (
                      <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full font-bold">
                        ✨ AI
                      </span>
                    )}
                    <span className={`text-xs font-bold ${isOverCapacity ? 'text-red-600' : 'text-slate-500'}`}>
                      {room.studentIds.length} students
                    </span>
                  </div>
                </div>

                {/* Capacity bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                  <div className={`h-1.5 rounded-full transition-all ${isOverCapacity ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, capacityPercent)}%` }} />
                </div>

                {/* Match reason */}
                {room.matchReason && (
                  <p className="text-xs text-slate-500 italic mb-3">{room.matchReason}</p>
                )}

                {/* Student chips */}
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {room.students.map(s => (
                    <div key={s._id}
                      className="bg-slate-50 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                      <span className="font-medium">{s.name}</span>
                      {s.branch && <span className="text-slate-400">· {s.branch}</span>}
                      {/* Move dropdown */}
                      <select className="opacity-0 group-hover:opacity-100 text-xs bg-transparent border-none w-6 cursor-pointer transition-opacity"
                        onChange={e => { if (e.target.value) moveStudent(s._id, room.roomId, e.target.value); e.target.value = ''; }}
                        title="Move to...">
                        <option value="">→</option>
                        {assignments.filter(a => a.roomId !== room.roomId).map(a => (
                          <option key={a.roomId} value={a.roomId}>{a.roomName}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {room.students.length === 0 && (
                    <div className="w-full p-4 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                      No students assigned
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
