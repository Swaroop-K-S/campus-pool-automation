import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Printer } from 'lucide-react';

const PrintManifestPage: React.FC = () => {
  const { driveId, roomId } = useParams<{ driveId: string, roomId: string }>();
  const [data, setData] = useState<{ drive: any, room: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/drives/${driveId}`),
      api.get(`/drives/${driveId}/rooms/${roomId}`)
    ])
      .then(([driveRes, roomRes]) => {
        setData({ drive: driveRes.data, room: roomRes.data });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [driveId, roomId]);

  if (loading) return <div className="p-10 text-center">Loading manifest...</div>;
  if (!data?.room) return <div className="p-10 text-center text-red-500">Failed to load room details.</div>;

  const { room, drive } = data;
  const students = room.assignedStudents || [];

  return (
    <div className="bg-white min-h-screen text-black print:bg-white print:p-0">
      {/* Non-print header / actions */}
      <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
        <div>
          <h1 className="font-bold text-lg text-slate-800">Print Manifest: {room.name}</h1>
          <p className="text-sm text-slate-500">Use A4 paper size and portrait orientation for best results.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Printer size={18} /> Print Document
        </button>
      </div>

      {/* Printable Area - styled explicitly for clean black/white print */}
      <div className="p-8 max-w-[210mm] mx-auto bg-white font-sans text-sm">
        <style>{`
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
            @page { size: A4 portrait; margin: 15mm; }
          }
        `}</style>
        
        {/* Document Header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">{drive.companyName}</h1>
            <p className="text-slate-600 font-semibold">{drive.jobRole} • Campus Placement Drive</p>
            {drive.eventDate && (
              <p className="text-slate-600 text-xs mt-1">
                Date: {new Date(drive.eventDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </p>
            )}
          </div>
          <div className="text-right border-l-2 border-slate-200 pl-4">
            <h2 className="text-xl font-bold text-slate-800">Room: {room.name}</h2>
            <p className="font-semibold text-slate-600">Floor: {room.floor}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase">Round: {room.round}</p>
          </div>
        </div>

        {/* Panelist Box */}
        {room.panelists && room.panelists.length > 0 && (
          <div className="bg-slate-50 border border-slate-300 p-4 rounded mb-6 break-inside-avoid">
            <h3 className="font-bold border-b border-slate-200 pb-2 mb-2 text-slate-700 uppercase tracking-wider text-xs">Invigilators / Panelists</h3>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              {room.panelists.map((p: any, i: number) => (
                <div key={i}>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.expertise?.join(', ')}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
              <span>Invigilator Sign 1: _________________</span>
              <span>Invigilator Sign 2: _________________</span>
            </div>
          </div>
        )}

        {/* Student List Table */}
        <div className="mb-4 flex justify-between items-end">
          <h3 className="font-bold text-lg">Allocated Candidates ({students.length})</h3>
        </div>

        <table className="w-full text-left border-collapse border border-slate-300 mb-8 max-w-full">
          <thead>
            <tr className="bg-slate-100 uppercase text-xs tracking-wider text-slate-600">
              <th className="border border-slate-300 p-2 w-12 text-center">#</th>
              <th className="border border-slate-300 p-2">Reference / USN</th>
              <th className="border border-slate-300 p-2">Candidate Name</th>
              <th className="border border-slate-300 p-2 w-32 border-r-[3px]">Status</th>
              <th className="border border-slate-300 p-2 w-32 text-center">Signature</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-slate-300 p-4 text-center italic text-slate-500">
                  No students assigned to this room yet.
                </td>
              </tr>
            ) : (
              students.map((student: any, i: number) => {
                const sData = student.data || {};
                const usn = student.referenceNumber || sData.usn || '-';
                const name = sData.name || sData.fullName || 'Unknown';
                
                return (
                  <tr key={student._id || i} className="break-inside-avoid border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="border border-slate-300 p-2 text-center text-slate-500 text-xs">{i + 1}</td>
                    <td className="border border-slate-300 p-2 font-mono text-sm">{usn}</td>
                    <td className="border border-slate-300 p-2">
                      <div className="font-semibold">{name}</div>
                      {sData.branch && <div className="text-xs text-slate-500">{sData.branch}</div>}
                    </td>
                    <td className="border border-slate-300 p-2 border-r-[3px] text-xs">
                       <span className={`px-2 py-0.5 rounded-full inline-block ${
                        student.status === 'selected' ? 'bg-green-100 text-green-700 border border-green-200' :
                        student.status === 'shortlisted' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        student.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                       }`}>
                         {student.status.toUpperCase()}
                       </span>
                    </td>
                    <td className="border border-slate-300 p-2 h-14">
                      {/* Empty space for physical signature */}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-slate-300 text-center text-xs text-slate-500 flex justify-between">
          <span>Generated by CampusPool V2</span>
          <span>Date: {new Date().toLocaleString('en-IN')}</span>
          <span>Room: {room.name} ({students.length} Total)</span>
        </div>
      </div>
    </div>
  );
};

export default PrintManifestPage;
