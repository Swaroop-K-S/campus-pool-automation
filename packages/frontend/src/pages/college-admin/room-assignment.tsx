import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

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

function DraggableStudent({ student, roomId, isOverlay = false }: { student: StudentChip, roomId: string, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student._id,
    data: { student, roomId }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Hide the original item while dragging if not the overlay itself
  if (isDragging && !isOverlay) {
    return <div ref={setNodeRef} className="h-[34px] w-full bg-slate-100 rounded-lg border border-dashed border-slate-300 opacity-50" />;
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`bg-white border ${isOverlay ? 'border-indigo-500 shadow-xl scale-105 cursor-grabbing' : 'border-slate-200 shadow-sm cursor-grab hover:border-indigo-300 hover:shadow-md'} text-slate-700 text-[11px] font-bold px-3 py-2 rounded-lg flex items-center justify-between transition-colors relative touch-none group`}>
      <div className="flex items-center gap-2 truncate pointer-events-none">
        <span className={`w-2 h-2 rounded-full ${isOverlay ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 group-hover:bg-indigo-400 transition-colors'}`} />
        <span className="truncate max-w-[140px]">{student.name}</span>
      </div>
      {student.branch && <span className="text-slate-400 font-medium ml-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-[9px] pointer-events-none">{student.branch}</span>}
    </div>
  );
}

function DroppableRoom({ room, confirmed }: any) {
  const { isOver, setNodeRef } = useDroppable({ id: room.roomId });
  const capacityPercent = Math.min(100, (room.studentIds.length / 30) * 100);
  const isOverCapacity = room.studentIds.length > 30;

  return (
    <div ref={setNodeRef}
      className={`bg-white rounded-[24px] p-6 border-2 transition-all flex flex-col ${isOver ? 'border-dashed border-indigo-400 bg-indigo-50/40 transform scale-[1.01]' : isOverCapacity ? 'border-red-200 shadow-sm' : 'border-slate-200/70 shadow-[0_4px_20px_-4px_rgba(6,81,237,0.03)]'}`}>
      
      {/* Room Header & Empty Seats */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">{room.roomName}</h3>
          {confirmed && (
            <button onClick={async () => {
                try {
                  const res: any = await api.get(`/invigilator/rooms/${room.roomId}/magic-link`);
                  if (res.success) { navigator.clipboard.writeText(res.data.url); toast.success('Link Copied!'); }
                } catch { toast.error('Failed'); }
              }}
              className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 mt-1 flex items-center gap-1 transition-colors">
              🔗 Copy Panelist Link
            </button>
          )}
        </div>
        <div className="flex flex-col items-end text-right">
          <div className="flex items-baseline gap-1">
             <span className={`text-3xl font-black tabular-nums tracking-tighter ${isOverCapacity ? 'text-red-500' : 'text-slate-300'}`}>
                {Math.max(0, 30 - room.studentIds.length)}
             </span>
             <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Seats</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden border border-slate-200/50">
        <div className={`h-full transition-all duration-700 ease-out ${isOverCapacity ? 'bg-red-500' : 'bg-indigo-500'}`}
          style={{ width: `${Math.min(100, capacityPercent)}%` }} />
      </div>

      {/* AI Indicator */}
      {room.matchScore > 50 && (
        <div className="mb-3">
          <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded border border-indigo-100 uppercase tracking-wider">
            ✨ AI Matched {room.matchScore}%
          </span>
        </div>
      )}

      {/* Draggable Chips Container */}
      <div className={`flex-1 rounded-xl p-3 border ${isOver ? 'bg-white border-indigo-100 inset-shadow-sm' : 'bg-slate-50/50 border-transparent'} overflow-y-auto max-h-[300px] custom-scrollbar transition-colors`}>
        <div className="flex flex-col gap-2">
          {room.students.map((s: any) => (
            <DraggableStudent key={s._id} student={s} roomId={room.roomId} />
          ))}
          {room.students.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs font-bold w-full rounded-lg border-2 border-dashed border-slate-200">
              Drop Students Here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UnassignedPool({ students }: { students: StudentChip[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'unassigned' });
  return (
    <div className="flex flex-col h-full bg-white rounded-[24px] shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Unassigned</h2>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Waiting Pool</p>
        </div>
        <div className="bg-amber-100 text-amber-700 font-black text-lg px-3 py-1 rounded-xl shadow-inner border border-amber-200">
          {students.length}
        </div>
      </div>
      <div ref={setNodeRef} className={`flex-1 overflow-y-auto p-4 flex flex-col gap-2 transition-colors ${isOver ? 'bg-indigo-50/30' : 'bg-slate-50/30'} custom-scrollbar`}>
        {students.map(s => <DraggableStudent key={s._id} student={s} roomId="unassigned" />)}
        {students.length === 0 && (
          <div className="m-auto text-center p-6 border-2 border-dashed border-slate-200 rounded-xl w-full">
             <div className="text-3xl mb-2 opacity-50 grayscale">🏝️</div>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pool Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoomAssignmentPage() {
  const { driveId } = useParams<{ driveId: string }>();
  const navigate = useNavigate();

  const [roundType, setRoundType] = useState('aptitude');
  const [assignments, setAssignments] = useState<AssignmentRoom[]>([]);
  const [unassigned, setUnassigned] = useState<StudentChip[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [activeDragStudent, setActiveDragStudent] = useState<StudentChip | null>(null);

  const [drive, setDrive] = useState<any>(null);
  const [loadedDrive, setLoadedDrive] = useState(false);

  // Fetch initial allocations and unassigned pool
  const fetchState = useCallback(async () => {
    try {
      setLoading('fetch');
      const data: any = await api.get(`/drives/${driveId}/rooms/${roundType}/assignments`);
      if (data?.success) {
         setAssignments(data.data.assignments || []);
         setUnassigned(data.data.unassigned || []);
         setTotalStudents(data.data.totalStudents || 0);
         // If there are already students in rooms from DB, assume it is saved.
         const hasSavedAssignments = (data.data.assignments || []).some((a: any) => a.studentIds.length > 0);
         setConfirmed(hasSavedAssignments);
      }
    } catch {
       toast.error('Failed to load assignments');
    }
    setLoading('');
  }, [driveId, roundType]);

  React.useEffect(() => {
    if (!loadedDrive) {
      api.get(`/drives/${driveId}`).then((d: any) => {
        if (d.success) setDrive(d.data);
        setLoadedDrive(true);
      });
    }
    fetchState();
  }, [fetchState, loadedDrive, driveId]);

  const rounds = drive?.rounds || [];

  const handleAutoAssign = useCallback(async () => {
    setLoading('random');
    try {
      const data: any = await api.post(`/drives/${driveId}/rooms/auto-assign/${roundType}`);
      if (data.success) {
        setAssignments(data.data.assignments);
        setTotalStudents(data.data.totalStudents);
        setUnassigned([]); // Overflow can be added when we return it from API.
        setConfirmed(false);
        toast.success('Random assignment generated!');
      } else toast.error(data.error || 'Failed');
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
        setUnassigned([]); 
        setConfirmed(false);
        toast.success('AI optimized mapping applied!');
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Network error'); }
    setLoading('');
  }, [driveId, roundType]);

  const handleClearAssignments = useCallback(() => {
    setAssignments(prev => prev.map(a => {
      const returningStudents = [...a.students];
      setUnassigned(u => [...u, ...returningStudents]);
      return { ...a, studentIds: [], students: [] };
    }));
    setConfirmed(false);
    toast.success('All rooms cleared. Remember to hit Commit.');
  }, []);

  const handleConfirm = useCallback(async () => {
    setLoading('confirm');
    try {
      const payload = {
        roundType,
        assignments: assignments.map(a => ({ roomId: a.roomId, studentIds: a.studentIds }))
      };
      const data: any = await api.post(`/drives/${driveId}/rooms/confirm-assignments`, payload);
      if (data.success) {
        setConfirmed(true);
        toast.success(`Allocated ${data.data.totalAssigned} students!`);
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Network error'); }
    setLoading('');
  }, [driveId, roundType, assignments]);

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveDragStudent(active.data.current?.student || null);
    setConfirmed(false); // Make sure saving is prompted if they drag anything
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragStudent(null);
    const { active, over } = event;
    if (!over) return;

    const studentId = active.id as string;
    const targetId = over.id as string;
    const sourceId = active.data.current?.roomId;

    if (targetId === sourceId) return;

    let studentToMove: StudentChip | undefined;

    // Remove from source
    if (sourceId === 'unassigned') {
      const idx = unassigned.findIndex(s => s._id === studentId);
      if (idx !== -1) {
        studentToMove = unassigned[idx];
        setUnassigned(prev => prev.filter(s => s._id !== studentId));
      }
    } else {
      setAssignments(prev => prev.map(a => {
        if (a.roomId === sourceId) {
          studentToMove = a.students.find(s => s._id === studentId);
          return { ...a, studentIds: a.studentIds.filter(id => id !== studentId), students: a.students.filter(s => s._id !== studentId) };
        }
        return a;
      }));
    }

    if (!studentToMove) return;

    // Add to target
    if (targetId === 'unassigned') {
      setUnassigned(prev => [studentToMove!, ...prev]);
    } else {
      setAssignments(prev => prev.map(a => {
        if (a.roomId === targetId) {
          return { ...a, studentIds: [...a.studentIds, studentId], students: [studentToMove!, ...a.students] };
        }
        return a;
      }));
    }
  };

  const assignedCount = assignments.reduce((s, a) => s + a.studentIds.length, 0);

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col max-w-[1600px] mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <button onClick={() => navigate(`/admin/drives/${driveId}`)}
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-95 shadow-sm">
           ←
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Assignment Engine</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{drive?.companyName} • {drive?.jobRole}</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="shrink-0 bg-white/90 backdrop-blur-xl rounded-[24px] border border-slate-200 p-3 mb-6 flex items-center gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-40">
        <div className="flex gap-1.5 pl-2">
          {rounds.map((r: any) => (
            <button key={r.type} onClick={() => setRoundType(r.type)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
                roundType === r.type ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {r.type.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-3 items-center border-l border-slate-200 pl-4 pr-1">
          {assignments.length > 0 && (
            <div className="flex items-center gap-4 mr-4 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-200">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapped</span>
               <span className="text-sm font-black text-slate-800">{assignedCount} <span className="text-slate-400 font-medium">/</span> {totalStudents}</span>
            </div>
          )}

          <button onClick={handleClearAssignments} disabled={!!loading || assignments.every(a => a.students.length === 0)}
            className="hover:bg-red-50 text-red-600 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95 transition-all text-center border border-red-200">
            🔄 Clear All
          </button>
          <button onClick={handleAutoAssign} disabled={!!loading}
            className="hover:bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95 transition-all flex items-center gap-2 border border-slate-200 shadow-sm">
            🎲 Auto Fill
          </button>
          <button onClick={handleAISuggest} disabled={!!loading}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 active:scale-95 transition-all shadow-sm flex items-center gap-2">
            ✨ AI Optimize
          </button>
          <button onClick={handleConfirm} disabled={assignments.length === 0 || confirmed || !!loading}
            className="bg-gradient-to-tr from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white px-8 py-2.5 rounded-xl text-sm font-black disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2">
            {confirmed ? '🔒 Saved' : '✓ Commit'}
          </button>
        </div>
      </div>

      {assignments.length === 0 && unassigned.length === 0 && !loading ? (
        <div className="flex-1 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[32px] flex items-center justify-center">
            <div className="text-center max-w-sm">
               <div className="text-6xl mb-6">🏫</div>
               <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">No Rooms Found</h3>
               <p className="text-slate-500 text-sm font-medium">Ensure rooms are configured for this round. Hit Auto Fill to distribute {totalStudents} students.</p>
            </div>
        </div>
      ) : (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 flex gap-6 min-h-0">
            {/* Left Pane */}
            <div className="w-[320px] lg:w-[380px] shrink-0">
               <UnassignedPool students={unassigned} />
            </div>
            
            {/* Right Pane Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
                 {assignments.map(room => (
                   <DroppableRoom key={room.roomId} room={room} confirmed={confirmed} />
                 ))}
               </div>
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeDragStudent ? (
              <DraggableStudent student={activeDragStudent} roomId="overlay" isOverlay={true} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

