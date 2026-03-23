import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

export default function InvigilatorSchedule() {
  const user = useAuthStore(s => s.user);
  const [drive, setDrive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const driveId = (user as any)?.driveId;

  useEffect(() => {
    document.title = 'Schedule — Invigilator';
    if (driveId) {
      api.get(`/drives/${driveId}`).then((d: any) => {
        if (d.success) setDrive(d.data);
        setLoading(false);
      });
    }
  }, [driveId]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading schedule...</div>;

  const rounds = drive?.rounds || [];
  const venue = drive?.venueDetails;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Event Schedule</h1>

      {/* Venue Info */}
      {venue && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="font-bold text-slate-700 mb-2">Venue Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Hall:</span> <strong>{venue.hallName || '-'}</strong></div>
            <div><span className="text-slate-500">Capacity:</span> <strong>{venue.hallCapacity || '-'}</strong></div>
            <div><span className="text-slate-500">Date:</span> <strong>{venue.eventDate || drive.eventDate || '-'}</strong></div>
            <div><span className="text-slate-500">Report Time:</span> <strong>{venue.reportTime || '-'}</strong></div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-0">
        {rounds.map((round: any, i: number) => {
          const isActive = round.status === 'active';
          const isCompleted = round.status === 'completed';
          const isLast = i === rounds.length - 1;

          return (
            <div key={round.type} className="flex gap-4">
              {/* Timeline Line */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'
                }`}>
                  {isCompleted ? '✓' : i + 1}
                </div>
                {!isLast && <div className={`w-0.5 h-16 ${isCompleted ? 'bg-green-300' : 'bg-slate-200'}`} />}
              </div>

              {/* Content */}
              <div className={`pb-8 rounded-xl mb-2 ${isActive ? 'bg-indigo-50 border border-indigo-200 p-4 -mt-1' : ''}`}>
                <h4 className="font-bold text-slate-800">{round.type.replace('_', ' ').toUpperCase()}</h4>
                <span className={`text-xs font-bold uppercase ${
                  isCompleted ? 'text-green-600' : isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}>{round.status}</span>
                {round.startTime && <p className="text-xs text-slate-500 mt-1">{round.startTime} - {round.endTime}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {rounds.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
          No rounds scheduled yet
        </div>
      )}
    </div>
  );
}
