import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { useSocket } from '../../hooks/use-socket';
import { Search } from 'lucide-react';

export default function InvigilatorDashboard() {
  const user = useAuthStore(s => s.user);
  const [room, setRoom] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [drive, setDrive] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const driveId = (user as any)?.driveId;
  const roomId = (user as any)?.roomId;

  const socket = useSocket();

  const fetchData = async () => {
    if (!driveId) return;
    try {
      const [driveData, roomsData]: any[] = await Promise.all([
        api.get(`/drives/${driveId}`),
        roomId ? api.get(`/drives/${driveId}/rooms/aptitude/assignments`) : Promise.resolve({ success: false })
      ]);
      if (driveData.success) setDrive(driveData.data);
      if (roomsData.success) {
        const myRoom = roomsData.data?.find((r: any) => r._id === roomId) || roomsData.data?.[0];
        if (myRoom) {
          setRoom(myRoom);
          setStudents(myRoom.assignedStudentDetails || []);
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    document.title = 'My Room — Invigilator';
    fetchData();
  }, [driveId, roomId]);

  // Live updates
  useEffect(() => {
    if (!socket) return;
    socket.on('round:status_changed', () => fetchData());
    socket.on('assignments:confirmed', () => fetchData());
    return () => { socket.off('round:status_changed'); socket.off('assignments:confirmed'); };
  }, [socket]);

  const activeRound = drive?.rounds?.find((r: any) => r.status === 'active');
  const completedRounds = drive?.rounds?.filter((r: any) => r.status === 'completed') || [];

  const filtered = students.filter(s => {
    const name = (s.name || '').toLowerCase();
    const usn = (s.usn || '').toLowerCase();
    return name.includes(search.toLowerCase()) || usn.includes(search.toLowerCase());
  });

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="h-40 bg-slate-200 animate-pulse rounded-2xl mb-6" />
      <div className="h-20 bg-slate-200 animate-pulse rounded-xl mb-6" />
      <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-200 animate-pulse rounded-lg" />)}</div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Room Info Card */}
      <div className="bg-indigo-600 rounded-2xl p-6 text-white mb-6">
        <h2 className="text-3xl font-black">{room?.name || 'Room Not Assigned'}</h2>
        <p className="text-indigo-200 mt-1">{room?.floor ? `Floor ${room.floor}` : ''} {room?.building ? `• ${room.building}` : ''}</p>
        <div className="flex items-center gap-4 mt-3">
          {activeRound && (
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
              ● {activeRound.type.replace('_', ' ').toUpperCase()}
            </span>
          )}
          <span className="text-indigo-200 text-sm">
            {students.length} students assigned
          </span>
        </div>
      </div>

      {/* Round Status Banner */}
      {activeRound ? (
        <div className="bg-indigo-600 text-white rounded-xl p-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="text-lg font-bold">{activeRound.type.replace('_', ' ').toUpperCase()} ROUND IN PROGRESS</span>
          </div>
        </div>
      ) : completedRounds.length > 0 ? (
        <div className="bg-green-50 text-green-700 rounded-xl p-4 mb-6 text-center font-bold">
          ✓ All Rounds Completed
        </div>
      ) : (
        <div className="bg-slate-100 text-slate-600 rounded-xl p-4 mb-6 text-center">
          Waiting for round to begin...
        </div>
      )}

      {/* Student List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Students in Your Room ({filtered.length})</h3>
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-slate-400" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-32" />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-600">Name</th>
              <th className="text-left p-3 font-semibold text-slate-600">USN</th>
              <th className="text-left p-3 font-semibold text-slate-600">Branch</th>
              <th className="text-left p-3 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s._id} className="border-b border-slate-50">
                <td className="p-3 font-medium text-slate-800">{s.name || '-'}</td>
                <td className="p-3 text-slate-600">{s.usn || '-'}</td>
                <td className="p-3 text-slate-600">{s.branch || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    s.status?.includes('passed') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>{s.status || 'assigned'}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">No students assigned to this room</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
