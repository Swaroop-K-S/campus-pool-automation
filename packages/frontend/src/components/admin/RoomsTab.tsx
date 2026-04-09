import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Settings, MousePointerClick, Activity, Lock, Unlock, ArrowRightLeft, Users, Navigation } from 'lucide-react';
import { useSocket } from '../../hooks/use-socket';


export default function RoomsTab({ driveId }: { drive: any, driveId: string }) {
  const [mode, setMode] = useState<'setup' | 'assign' | 'live'>('setup');
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/drives/${driveId}/rooms`);
      if ((res as any).success) {
        setRooms((res as any).data);
      }
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [driveId]);

  useEffect(() => {
    if (!socket) return;
    socket.on('room:updated', fetchRooms);
    socket.on('room:locked', fetchRooms);
    socket.on('room:student_transferred', fetchRooms);
    socket.on('drive:round_rotated', fetchRooms);

    return () => {
      socket.off('room:updated');
      socket.off('room:locked');
      socket.off('room:student_transferred');
      socket.off('drive:round_rotated');
    };
  }, [socket]);

  return (
    <div className="p-8 overflow-y-auto h-full flex flex-col gap-6 bg-slate-50/50">
      
      {/* Mode Switcher Header */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Navigation size={20} className="text-indigo-600" /> Room Logistics Engine
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage physical rooms, panelist routing, and student logistics.</p>
        </div>
        
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shadow-inner">
          <button 
            onClick={() => setMode('setup')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${mode === 'setup' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <Settings size={14} /> Setup
          </button>
          <button 
            onClick={() => setMode('assign')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${mode === 'assign' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <MousePointerClick size={14} /> Assign
          </button>
          <button 
            onClick={() => setMode('live')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${mode === 'live' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <Activity size={14} /> Live View
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center font-bold text-slate-400">Loading Configuration...</div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          {mode === 'setup' && <RoomSetupMode driveId={driveId} rooms={rooms} onRefresh={fetchRooms} />}
          {mode === 'assign' && <RoomAssignMode driveId={driveId} rooms={rooms} />}
          {mode === 'live' && <RoomLiveMode driveId={driveId} rooms={rooms} onRefresh={fetchRooms} />}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// MODE COMPONENTS (Inlined for simplicity initially)
// ----------------------------------------------------

function RoomSetupMode({ driveId, rooms, onRefresh }: { driveId: string, rooms: any[], onRefresh: () => void }) {
  const [newRoomName, setNewRoomName] = useState('');
  const [newCapacity, setNewCapacity] = useState(30);
  const [newRound, setNewRound] = useState('aptitude');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddRoom = async () => {
    if (!newRoomName || newCapacity <= 0) return toast.error('Check inputs');
    setIsAdding(true);
    try {
      await api.post(`/drives/${driveId}/rooms`, {
        name: newRoomName, capacity: newCapacity, round: newRound, floor: 'G'
      });
      toast.success('Room added');
      setNewRoomName('');
      onRefresh();
    } catch {
      toast.error('Failed to add room');
    } finally { setIsAdding(false); }
  };

  const deleteRoom = async (roomId: string) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      await api.delete(`/drives/${driveId}/rooms/${roomId}`);
      toast.success('Room deleted');
      onRefresh();
    } catch { toast.error('Failed to delete room'); }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest mb-4">Add New Room</h3>
      <div className="flex items-end gap-4 mb-8">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1">Room Name</label>
          <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="e.g. Lab 1" className="w-full px-4 py-2 border rounded-xl" />
        </div>
        <div className="w-32">
          <label className="block text-xs font-bold text-slate-500 mb-1">Capacity</label>
          <input type="number" value={newCapacity} onChange={e => setNewCapacity(Number(e.target.value))} className="w-full px-4 py-2 border rounded-xl" />
        </div>
        <div className="w-48">
          <label className="block text-xs font-bold text-slate-500 mb-1">Assigned Round</label>
          <select value={newRound} onChange={e => setNewRound(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
             <option value="aptitude">Aptitude</option>
             <option value="technical_interview">Technical</option>
             <option value="hr_interview">HR</option>
          </select>
        </div>
        <button onClick={handleAddRoom} disabled={isAdding} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Add</button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {rooms.map(r => (
          <div key={r._id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-start">
             <div>
                <h4 className="font-black text-slate-800">{r.name}</h4>
                <p className="text-xs font-bold text-slate-400">Capacity: {r.capacity} • {r.round}</p>
             </div>
             <button onClick={() => deleteRoom(r._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Users size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomAssignMode({ driveId }: { driveId: string, rooms: any[] }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [roundType, setRoundType] = useState('aptitude');

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/drives/${driveId}/rooms/${roundType}/assignments`);
      if ((res as any).success) {
        setAssignments((res as any).data.assignments);
        setUnassigned((res as any).data.unassigned);
      }
    } catch {
      toast.error('Failed to grab assignments');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAssignments(); }, [roundType]);

  const autoAssign = async () => {
    try {
      const res = await api.post(`/drives/${driveId}/rooms/auto-assign/${roundType}`, { isFirstRound: roundType === 'aptitude' });
      if ((res as any).success) {
        toast.success('Auto-assigned successfully!');
        fetchAssignments();
      }
    } catch (err: any) { toast.error(err.message || 'Auto assign failed'); }
  };

  const confirmAssignments = async () => {
    try {
      const mapped = assignments.map(a => ({ roomId: a.roomId, studentIds: a.studentIds }));
      const res = await api.post(`/drives/${driveId}/rooms/confirm-assignments`, { roundType, assignments: mapped });
      if ((res as any).success) toast.success('Confirmed assignments!');
    } catch { toast.error('Failed to confirm'); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 bg-white border-b flex justify-between items-center">
            <select value={roundType} onChange={e => setRoundType(e.target.value)} className="px-4 py-2 rounded-lg border font-bold">
               <option value="aptitude">Aptitude</option>
               <option value="technical_interview">Technical</option>
               <option value="hr_interview">HR</option>
            </select>
            <div className="flex gap-2">
                <button onClick={autoAssign} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">Auto Assign ✨</button>
                <button onClick={confirmAssignments} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Save & Publish</button>
            </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
             <div className="grid grid-cols-3 gap-6">
                 {loading ? <div>Loading...</div> : assignments.map(a => (
                     <div key={a.roomId} className="bg-white rounded-xl shadow-sm border p-4">
                         <h4 className="font-black text-slate-800 mb-2">{a.roomName}</h4>
                         <div className="text-xs text-slate-500 mb-4">{a.studentIds?.length || 0} students assigned</div>
                         <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                             {a.students?.map((s: any) => (
                                 <div key={s._id} className="text-xs py-1 px-2 bg-slate-50 border rounded truncate">{s.name}</div>
                             ))}
                         </div>
                     </div>
                 ))}
                 <div className="bg-white rounded-xl shadow-sm border p-4 bg-amber-50">
                      <h4 className="font-black text-amber-800 mb-2">Unassigned Pool</h4>
                      <div className="text-xs text-amber-600 mb-4">{unassigned.length} students</div>
                      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                           {unassigned.map(s => <div key={s._id} className="text-xs py-1 px-2 bg-white border border-amber-100 rounded truncate text-amber-900">{s.name}</div>)}
                      </div>
                 </div>
             </div>
        </div>
    </div>
  );
}

function RoomLiveMode({ driveId, rooms, onRefresh }: { driveId: string, rooms: any[], onRefresh: () => void }) {
  const toggleLock = async (roomId: string, isLocked: boolean) => {
    try {
      await api.patch(`/drives/${driveId}/rooms/${roomId}/lock`, { isLocked: !isLocked });
      toast.success(!isLocked ? 'Room Locked' : 'Room Unlocked');
      onRefresh();
    } catch { toast.error('Failed to toggle lock state'); }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {rooms.map(r => (
        <div key={r._id} className={`border p-6 rounded-2xl shadow-sm transition-all ${r.isLocked ? 'bg-slate-50 border-slate-300 opacity-80' : 'bg-white border-slate-200'}`}>
           <div className="flex justify-between items-start mb-4">
               <div>
                   <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                       {r.name} {r.isLocked && <Lock size={14} className="text-red-500" />}
                   </h4>
                   <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">{r.round}</p>
               </div>
               <button 
                  onClick={() => toggleLock(r._id, r.isLocked)}
                  className={`p-2 rounded-xl transition-colors ${r.isLocked ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                   {r.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
               </button>
           </div>

           <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
               <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, ((r.assignedStudents?.length || 0)/r.capacity)*100)}%` }} />
           </div>
           
           <div className="flex justify-between text-xs font-bold">
               <span className="text-slate-500">{(r.assignedStudents || []).length} assigned</span>
               <span className="text-slate-400">/{r.capacity} capacity</span>
           </div>

           <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
               <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                   EWT: ~{((r.assignedStudents?.length || 0) * 15)}m
               </span>
               <button className="text-[10px] uppercase font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <ArrowRightLeft size={12} /> Transfer
               </button>
           </div>
        </div>
      ))}
    </div>
  );
}
