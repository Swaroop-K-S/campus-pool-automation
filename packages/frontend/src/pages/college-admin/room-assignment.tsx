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

      {/* Round selector (Sticky Context Header) */}
      <div className="sticky top-20 z-40 bg-white/85 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-4 mb-6 flex items-center gap-4 flex-wrap shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
        <label className="text-sm font-black text-slate-800 uppercase tracking-widest pl-2">Configure Round:</label>
        <div className="flex gap-2">
          {rounds.map((r: any) => (
            <button key={r.type} onClick={() => setRoundType(r.type)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                roundType === r.type
                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/30 ring-offset-1'
                  : 'bg-slate-100 text-slate-600 hover:bg-white hover:border-slate-300 hover:shadow-sm border border-transparent'
              }`}>
              {r.type.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-3 items-center border-l border-slate-200/60 pl-4">
          <button onClick={handleAutoAssign} disabled={!!loading}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95 transition-all shadow-md flex items-center gap-2">
            {loading === 'random' ? <span className="animate-spin text-lg">⏳</span> : '🎲'} Auto Assign
          </button>
          <button onClick={handleAISuggest} disabled={!!loading}
            className="bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2">
            {loading === 'ai' ? <span className="animate-spin text-lg">⏳</span> : '✨'} AI Suggest
          </button>

          {matchQuality !== null && (
            <span className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide border shadow-sm ${qualityColor}`}>
              Match Quality: {matchQuality}%
            </span>
          )}

          <button onClick={handleConfirm} disabled={assignments.length === 0 || confirmed || !!loading}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-black disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2">
            {loading === 'confirm' ? <span className="animate-spin text-lg">⏳</span> : '✓'} Confirm & Save
          </button>
        </div>
      </div>

      {/* Summary */}
      {assignments.length > 0 && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-6 flex items-center gap-6 text-sm">
          <span className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">{totalStudents}</div> students mapped</span>
          <span className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black">{assignments.length}</div> rooms active</span>
          <span className="flex items-center gap-2">Assigned Capacity: <strong className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded text-xs">
            {assignments.reduce((s, a) => s + a.studentIds.length, 0)}
          </strong></span>
          {confirmed && <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-black ml-auto flex items-center gap-1 shadow-sm">✓ Saved to Database</span>}
        </div>
      )}

      {/* Assignment Grid */}
      {assignments.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200/80 p-20 text-center shadow-sm">
          <div className="text-6xl mb-6 animate-bounce">🏫</div>
          <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Ready for Room Allocation</h3>
          <p className="text-slate-500 text-sm font-medium">Select a round step above and click "Auto Assign" or "AI Suggest" to intelligently group your candidates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((room) => {
            const capacityPercent = Math.min(100, (room.studentIds.length / 30) * 100); // default cap 30
            const isOverCapacity = room.studentIds.length > 30;
            return (
              <div key={room.roomId}
                className={`bg-white rounded-[20px] p-6 border-2 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition-all hover:shadow-lg ${
                  room.matchScore > 70 ? 'border-indigo-200 hover:border-indigo-300' :
                  isOverCapacity ? 'border-red-200 hover:border-red-300' : 'border-slate-100 hover:border-slate-200'
                }`}>
                {/* Room Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">{room.roomName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.matchScore > 50 && (
                      <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text text-xs font-black bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100/50 shadow-sm">
                        ✨ AI Optimized
                      </span>
                    )}
                    <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-slate-50 border ${isOverCapacity ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-500 border-slate-200'}`}>
                      {room.studentIds.length} / 30
                    </span>
                  </div>
                </div>

                {/* Capacity bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden border border-slate-200/50">
                  <div className={`h-full transition-all duration-1000 ease-out ${isOverCapacity ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'}`}
                    style={{ width: `${Math.min(100, capacityPercent)}%` }} />
                </div>

                {/* Match reason */}
                {room.matchReason && (
                  <p className="text-xs text-slate-400 font-medium mb-4 flex items-start gap-1">
                    <span className="text-indigo-400">↳</span> {room.matchReason}
                  </p>
                )}

                {/* Student chips */}
                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                  {room.students.map(s => (
                    <div key={s._id}
                      className="bg-white border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:border-indigo-300 hover:shadow-md hover:text-indigo-700 transition-all duration-200 group relative cursor-pointer overflow-hidden">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500 group-hover:scale-125 transition-all" />
                      <span className="truncate max-w-[80px]">{s.name}</span>
                      {s.branch && <span className="text-slate-400 font-medium ml-1 bg-slate-50 px-1 rounded"> {s.branch}</span>}
                      
                      {/* Hover-Reveal Density Actions */}
                      <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-white via-white to-transparent pl-4 pr-1 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-200 flex items-center">
                        <select className="text-[10px] font-black text-indigo-600 bg-indigo-50 rounded px-1 py-0.5 border-none appearance-none cursor-pointer outline-none hover:bg-indigo-100 transition-colors shadow-sm"
                          onChange={e => { if (e.target.value) moveStudent(s._id, room.roomId, e.target.value); e.target.value = ''; }}
                          title="Transfer to another room">
                          <option value="">Move ↗</option>
                          {assignments.filter(a => a.roomId !== room.roomId).map(a => (
                            <option key={a.roomId} value={a.roomId}>{a.roomName}</option>
                          ))}
                        </select>
                      </div>
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
