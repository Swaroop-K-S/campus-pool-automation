import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

export default function HRGDAssignments() {
  const user = useAuthStore(s => s.user);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const driveId = (user as any)?.driveId;

  useEffect(() => {
    document.title = 'GD Assignments — HR Portal';
    if (driveId) {
      api.get(`/drives/${driveId}/rooms/gd/assignments`).then((d: any) => {
        if (d.success) setRooms(d.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [driveId]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading assignments...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">GD Room Assignments</h1>

      {rooms.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="text-5xl mb-4">🏫</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Assignments Yet</h3>
          <p className="text-slate-500 text-sm">GD room assignments will appear here once the admin configures them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room: any) => (
            <div key={room._id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-800 text-lg">{room.name}</h3>
                <span className="text-xs font-bold text-slate-500">{room.assignedStudentDetails?.length || 0} students</span>
              </div>
              
              {/* Panelists */}
              {room.panelists?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Panelists</p>
                  {room.panelists.map((p: any, i: number) => (
                    <div key={i} className="text-sm text-slate-700">
                      {p.name} <span className="text-slate-400">· {(p.expertise || []).join(', ')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Student List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(room.assignedStudentDetails || []).map((s: any) => (
                  <div key={s._id} className="bg-slate-50 rounded-lg px-3 py-2 text-sm flex justify-between">
                    <span className="font-medium text-slate-700">{s.name}</span>
                    <span className="text-slate-400">{s.branch}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
