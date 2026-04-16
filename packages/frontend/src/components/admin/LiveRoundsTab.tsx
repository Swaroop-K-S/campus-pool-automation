import { useState, useEffect } from 'react';
import { Download, UploadCloud, Users, CheckCircle, Loader2, ArrowRight, Megaphone } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/use-socket';

export function LiveRoundsTab({ driveId, rounds, onUpdate }: { driveId: string, rounds: any[], onUpdate: () => void }) {
  const [selectedRound, setSelectedRound] = useState<string>(rounds[0]?.type || '');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const socket = useSocket();

  useEffect(() => {
    if (selectedRound) fetchRoundStudents();
  }, [selectedRound]);

  useEffect(() => {
    if (!driveId) return;
    socket.emit('join:drive', driveId);

    const handleRefresh = () => {
      if (selectedRound) fetchRoundStudents();
    };

    socket.on('student:verified', handleRefresh);
    socket.on('drive:round_batch_updated', handleRefresh);

    return () => {
      socket.off('student:verified', handleRefresh);
      socket.off('drive:round_batch_updated', handleRefresh);
    };
  }, [driveId, selectedRound]);

  const fetchRoundStudents = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/drives/${driveId}/rounds/${selectedRound}/students`);
      if (res.success) setStudents(res.data);
    } catch { toast.error('Failed to load students'); }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/rounds/${selectedRound}/export`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Round_${selectedRound}_Students.csv`;
      document.body.appendChild(a); a.click();
    } catch { toast.error('Failed to export students'); }
  };

  const handleUploadResults = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/rounds/${selectedRound}/results`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Successfully advanced ${data.data.advancedCount} students!`);
        fetchRoundStudents();
        onUpdate();
      } else throw new Error(data.error);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload results');
    }
    setUploadLoading(false);
    e.target.value = '';
  };

  const handleFinalSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Uploading final selection will close this drive and mark these students as Hired. Proceed?')) return;

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/final-selection`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Successfully hired ${data.data.hiredCount} students! Drive closed.`);
        onUpdate();
      } else throw new Error(data.error);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload final selection');
    }
    setUploadLoading(false);
    e.target.value = '';
  };

  const handleBroadcast = () => {
    if (!broadcastMessage.trim()) return;
    if (!confirm(`Are you sure you want to broadcast this to all students?`)) return;
    socket.emit('admin:broadcast', { driveId, message: broadcastMessage });
    toast.success('Broadcast sent globally!');
    setBroadcastMessage('');
  };

  if (!rounds || rounds.length === 0) return <div className="p-8 text-center text-slate-500">No rounds configured.</div>;

  return (
    <div className="p-8 h-full overflow-y-auto max-w-7xl mx-auto flex gap-8">
      
      {/* Sidebar: Round Selector */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Round Progression</h3>
        {rounds.map((r, i) => (
          <button key={r.type} onClick={() => setSelectedRound(r.type)}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold text-sm text-left ${
              selectedRound === r.type ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
              selectedRound === r.type ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>{i + 1}</span>
            <span className="flex-1 truncate">{r.label || r.type.replace('_',' ')}</span>
            {r.status === 'completed' && <CheckCircle size={16} className={selectedRound === r.type ? 'text-indigo-200' : 'text-green-500'} />}
          </button>
        ))}

        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">End of Drive</h3>
          <div className="relative group overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 rounded-xl shadow-md border-2 border-transparent hover:border-emerald-300 transition-all">
            <div className="font-bold text-sm mb-1 flex items-center gap-2"><CheckCircle size={16}/> Final Selection</div>
            <p className="text-xs text-emerald-100 mb-4 opacity-90 leading-tight">Upload the final list of hired students to close the drive.</p>
            <label className="bg-white text-emerald-700 px-3 py-2 rounded-lg text-xs font-black cursor-pointer hover:bg-emerald-50 transition w-full flex items-center justify-center gap-2">
              {uploadLoading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
              Upload Hired CSV
              <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFinalSelection} disabled={uploadLoading} />
            </label>
          </div>
        </div>

        {/* Megaphone Widget */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">Global Comms <Megaphone size={14}/></h3>
          <div className="bg-sky-50 rounded-xl p-3 border border-sky-100 shadow-inner">
            <textarea
              className="w-full text-xs font-medium p-2 rounded-lg border border-sky-200 resize-none focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white placeholder-slate-400"
              rows={3}
              placeholder="e.g., LUNCH BREAK EXTENDED BY 15 MINS..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
            ></textarea>
            <button 
              onClick={handleBroadcast}
              disabled={!broadcastMessage.trim()}
              className="mt-2 w-full bg-sky-500 hover:bg-sky-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all text-white font-bold text-xs py-2 rounded-lg shadow-sm"
            >
              SEND BROADCAST
            </button>
          </div>
        </div>
      </div>

      {/* Main Panel: Round Viewer */}
      <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-800 capitalize">{selectedRound.replace('_',' ')}</h2>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-1">
              <Users size={14} /> {students.length} students currently in this round
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExport} disabled={students.length === 0}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-sm">
              <Download size={16} /> Export File
            </button>
            
            <label className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all shadow-md cursor-pointer ${
                uploadLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-500/20'
              }`}>
              {uploadLoading ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16}/>}
              Upload Passed Results <ArrowRight size={16}/>
              <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleUploadResults} disabled={uploadLoading} />
            </label>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto bg-slate-50/30">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400"><Loader2 className="animate-spin w-8 h-8" /></div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4"><Users size={24}/></div>
              <h3 className="text-slate-700 font-bold mb-1">No students found</h3>
              <p className="text-slate-500 text-sm max-w-sm">There are no students currently active in this round. Have you advanced them from the previous stage yet?</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 sticky top-0 shadow-sm border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">USN</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Branch</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">CGPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-indigo-50/50 transition-colors group">
                    <td className="px-6 py-3 border-b border-transparent group-hover:border-indigo-100 font-mono text-sm font-bold text-slate-700">{s.usn}</td>
                    <td className="px-6 py-3 border-b border-transparent group-hover:border-indigo-100 text-sm font-semibold text-slate-900">{s.name}</td>
                    <td className="px-6 py-3 border-b border-transparent group-hover:border-indigo-100 text-sm font-medium text-slate-500">{s.branch}</td>
                    <td className="px-6 py-3 border-b border-transparent group-hover:border-indigo-100 text-sm font-bold text-indigo-600">{s.cgpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
