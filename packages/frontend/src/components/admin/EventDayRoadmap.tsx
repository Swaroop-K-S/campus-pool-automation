import { useState, useEffect } from 'react';
import { Download, UploadCloud, Users, CheckCircle, Loader2, Wand2, X } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export function EventDayRoadmap({ driveId, rounds, onUpdate }: { driveId: string, rounds: any[], onUpdate: () => void }) {
  const [selectedRound, setSelectedRound] = useState<string>(rounds[0]?.type || '');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Auto-Assign State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [enforceGenderRatio, setEnforceGenderRatio] = useState(false);
  const isFirstRound = rounds[0]?.type === selectedRound;

  useEffect(() => {
    if (selectedRound && selectedRound !== 'end_of_drive') {
      fetchRoundStudents();
    }
  }, [selectedRound]);

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
        headers: { Authorization: `Bearer ${localStorage.getItem('campuspool-auth') ? JSON.parse(localStorage.getItem('campuspool-auth') || '{}').state?.accessToken : ''}` }
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
        headers: { Authorization: `Bearer ${localStorage.getItem('campuspool-auth') ? JSON.parse(localStorage.getItem('campuspool-auth') || '{}').state?.accessToken : ''}` },
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
        headers: { Authorization: `Bearer ${localStorage.getItem('campuspool-auth') ? JSON.parse(localStorage.getItem('campuspool-auth') || '{}').state?.accessToken : ''}` },
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

  const handleAutoAssign = async () => {
    setAssignLoading(true);
    try {
      const auth = JSON.parse(localStorage.getItem('campuspool-auth') || '{}');
      const token = auth.state?.accessToken;
      
      // 1. Get Auto-Assign preview
      const previewRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/rooms/auto-assign/${selectedRound}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enforceGenderRatio, isFirstRound })
      });
      const previewData = await previewRes.json();
      
      if (!previewData.success) throw new Error(previewData.error);
      
      // 2. Automatically Confirm the assignment
      const confirmRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/rooms/confirm-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roundType: selectedRound, assignments: previewData.data.assignments })
      });
      const confirmData = await confirmRes.json();
      
      if (!confirmData.success) throw new Error(confirmData.error);

      toast.success(`Successfully assigned ${confirmData.data.totalAssigned} students to rooms!`);
      setShowAssignModal(false);
      onUpdate(); // refresh the parent to show room changes
    } catch (err: any) {
      toast.error(err.message || 'Failed to auto-assign rooms');
    }
    setAssignLoading(false);
  };

  if (!rounds || rounds.length === 0) return <div className="p-8 text-center text-slate-500">No rounds configured.</div>;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h3 className="text-lg font-semibold text-slate-800">Advanced Rounds Roadmap</h3>
        <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">Live Execution</span>
      </div>

      {/* Horizontal Node Graph */}
      <div className="flex items-center w-full relative overflow-x-auto pb-4 scrollbar-hide px-4 pt-2">
        {rounds.map((r, i) => (
          <div key={r.type} className="flex items-center shrink-0 group">
            <button 
              onClick={() => setSelectedRound(r.type)}
              className="flex flex-col items-center gap-2 relative z-10 w-24 outline-none"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-sm ${
                selectedRound === r.type ? 'border-indigo-600 bg-indigo-600 text-white scale-110' : 
                r.status === 'completed' ? 'border-green-500 bg-green-500 text-white' : 
                'border-slate-200 bg-white text-slate-400 hover:border-indigo-300'
              }`}>
                {r.status === 'completed' ? <CheckCircle size={20} /> : <span className="font-bold text-sm">{i + 1}</span>}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider text-center px-1 transition-colors ${
                selectedRound === r.type ? 'text-indigo-700' : 'text-slate-500'
              }`}>{r.label || r.type.replace('_',' ')}</span>
            </button>
            
            {/* Connector Line */}
            <div className={`w-16 h-1 transition-all duration-500 -ml-2 -mr-2 z-0 ${i === rounds.length - 1 ? 'w-16' : ''} ${
              r.status === 'completed' ? 'bg-green-500' : 'bg-slate-200'
            }`} />
          </div>
        ))}

        {/* End of Drive Node */}
        <div className="flex items-center shrink-0">
          <button 
            onClick={() => setSelectedRound('end_of_drive')}
            className="flex flex-col items-center gap-2 relative z-10 w-24 outline-none"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-sm ${
              selectedRound === 'end_of_drive' ? 'border-emerald-600 bg-emerald-600 text-white scale-110 shadow-emerald-200' : 
              'border-slate-200 bg-white text-slate-400 hover:border-emerald-300'
            }`}>
              <CheckCircle size={20} />
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider text-center px-1 transition-colors ${
              selectedRound === 'end_of_drive' ? 'text-emerald-700' : 'text-slate-500'
            }`}>Final Select</span>
          </button>
        </div>
      </div>

      {/* Expanded Content Area below Node Graph */}
      <div className="mt-2 bg-slate-50/50 rounded-2xl border border-slate-200 shadow-inner overflow-hidden flex flex-col transition-all duration-300 min-h-[400px]">
        {selectedRound === 'end_of_drive' ? (
          // End of Drive Upload View
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Final Selections</h2>
            <p className="text-slate-500 max-w-md mb-8">Upload the final list of hired students to close this placement drive. This will mark all students in the spreadsheet as Hired.</p>
            
            <label className="flex items-center gap-3 px-8 py-4 rounded-xl text-base font-black transition-all shadow-xl cursor-pointer bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/30 hover:-translate-y-1">
              {uploadLoading ? <Loader2 size={20} className="animate-spin"/> : <UploadCloud size={20}/>}
              Upload Final Hired CSV
              <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFinalSelection} disabled={uploadLoading} />
            </label>
          </div>
        ) : (
          // Standard Round Viewer
          <div className="flex flex-col h-full">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
              <div>
                <h2 className="text-lg font-black text-slate-800 capitalize leading-none">{selectedRound.replace('_',' ')}</h2>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-2">
                  <Users size={14} /> {students.length} students waiting in this round
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAssignModal(true)} disabled={students.length === 0}
                  className="flex items-center gap-2 bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-sm shadow-indigo-500/20">
                  <Wand2 size={16} /> Auto-Assign Rooms
                </button>
                <button onClick={handleExport} disabled={students.length === 0}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-sm">
                  <Download size={16} /> Export CSV
                </button>
                
                <label className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all shadow-md cursor-pointer ${
                    uploadLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/20 hover:-translate-y-0.5'
                  }`}>
                  {uploadLoading ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16}/>}
                  Drop Pass List (XLSX)
                  <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleUploadResults} disabled={uploadLoading} />
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-white min-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="animate-spin w-8 h-8" /></div>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4"><Users size={24}/></div>
                  <h3 className="text-slate-600 font-bold mb-1">No students found</h3>
                  <p className="text-slate-400 text-sm max-w-sm">There are no students currently pending in this round. Upload results from the previous stage to populate this list.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 sticky top-0 shadow-sm border-b border-slate-200 z-10">
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">USN</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Name</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Branch</th>
                      <th className="px-6 py-4 text-xs font-black text-indigo-500 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr key={s._id} className="hover:bg-indigo-50/50 transition-colors group">
                        <td className="px-6 py-3 border-b border-transparent group-hover:border-indigo-100 font-mono text-sm font-bold text-slate-700">{s.usn}</td>
                        <td className="px-6 py-3 border-b border-transparent group-hover:border-indigo-100 text-sm font-semibold text-slate-900">{s.name}</td>
                        <td className="px-6 py-3 border-b border-transparent group-hover:border-indigo-100 text-sm font-medium text-slate-500">{s.branch}</td>
                        <td className="px-6 py-3 border-b border-transparent group-hover:border-indigo-100 flex items-center justify-start"><span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded-lg">Waiting</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Auto Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3 text-indigo-600">
                <Wand2 size={24} />
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Auto-Assign Rooms</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800">
                <p className="font-semibold mb-1">
                  {isFirstRound ? 'Initial Round Allocation' : 'Subsequent Round Allocation'}
                </p>
                <p className="text-indigo-600/80 leading-relaxed">
                  {isFirstRound 
                    ? 'The engine will pull all students marked as "Shortlisted" for this first round.'
                    : 'The engine will prioritize students marked as "Attended" (QR check-in) or those who passed the previous round via upload.'}
                </p>
              </div>

              <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer bg-white shadow-sm">
                <div className="flex h-6 items-center">
                  <input
                    type="checkbox"
                    checked={enforceGenderRatio}
                    onChange={(e) => setEnforceGenderRatio(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 transition-all cursor-pointer"
                  />
                </div>
                <div className="flex text-sm leading-6">
                  <div>
                    <span className="font-bold text-slate-900 block mb-1">Enforce 50-50 Gender Ratio</span>
                    <span className="text-slate-500 font-medium">
                      Ideal for Group Discussion (GD) rounds. The algorithm will evenly distribute male and female students across all available rooms.
                    </span>
                  </div>
                </div>
              </label>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowAssignModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                disabled={assignLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleAutoAssign}
                disabled={assignLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {assignLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {assignLoading ? 'Assigning...' : 'Assign & Save Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
