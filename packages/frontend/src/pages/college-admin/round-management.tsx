import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface RoundResult {
  passed: number;
  failed: number;
  notMatched: number;
  nextRound: string | null;
}

export default function RoundManagementPage() {
  const { driveId } = useParams<{ driveId: string }>();
  const navigate = useNavigate();

  const [drive, setDrive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<{ [round: string]: File | null }>({});
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [roundResults, setRoundResults] = useState<{ [round: string]: RoundResult }>({});
  const [finalResult, setFinalResult] = useState<{ selected: number; notFound: number } | null>(null);
  const [uploading, setUploading] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [showSelected, setShowSelected] = useState(false);
  const [funnelCounts, setFunnelCounts] = useState<{ [key: string]: number }>({});

  const fetchDrive = useCallback(async () => {
    const data: any = await api.get(`/drives/${driveId}`);
    if (data.success) setDrive(data.data);
    setLoading(false);
  }, [driveId]);

  const fetchFunnel = useCallback(async () => {
    if (!drive) return;
    const counts: { [key: string]: number } = {};
    // Get invited/attended from applications
    const apps: any = await api.get(`/drives/${driveId}/applications`);
    if (apps.success) {
      const all = apps.data?.applications || apps.data || [];
      counts['invited'] = all.length;
      counts['attended'] = all.filter((a: any) => ['attended', 'selected'].includes(a.status) || a.status?.includes('passed')).length;
      counts['selected'] = all.filter((a: any) => a.status === 'selected').length;
      // Per-round counts
      for (const round of (drive?.rounds || [])) {
        counts[round.type] = all.filter((a: any) =>
          a.status === `${round.type}_passed` || a.currentRound === round.type ||
          (round.status === 'active' && a.status === 'attended')
        ).length;
      }
    }
    setFunnelCounts(counts);
  }, [driveId, drive]);

  useEffect(() => { fetchDrive(); }, [fetchDrive]);
  useEffect(() => { if (drive) fetchFunnel(); }, [drive, fetchFunnel]);

  const handleUploadResults = async (roundType: string) => {
    const file = uploadFile[roundType];
    if (!file) return;
    setUploading(roundType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data: any = await api.post(`/drives/${driveId}/rounds/${roundType}/results`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.success) {
        setRoundResults(prev => ({ ...prev, [roundType]: data.data }));
        toast.success(`Results uploaded: ${data.data.passed} passed, ${data.data.failed} failed`);
        fetchDrive();
        fetchFunnel();
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch { toast.error('Network error'); }
    setUploading('');
  };

  const handleFinalSelection = async () => {
    if (!finalFile) return;
    setUploading('final');
    try {
      const formData = new FormData();
      formData.append('file', finalFile);
      const data: any = await api.post(`/drives/${driveId}/final-selection`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.success) {
        setFinalResult(data.data);
        toast.success(`🎉 ${data.data.selected} students selected!`);
        fetchFunnel();
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch { toast.error('Network error'); }
    setUploading('');
  };

  const viewSelected = async () => {
    const data: any = await api.get(`/drives/${driveId}/selected`);
    if (data.success) {
      setSelectedStudents(data.data);
      setShowSelected(true);
    }
  };

  if (loading) return (
    <div className="p-8 text-center text-slate-400">Loading...</div>
  );

  const rounds = drive?.rounds || [];
  const allCompleted = rounds.every((r: any) => r.status === 'completed');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/admin/drives/${driveId}`)}
          className="text-slate-400 hover:text-slate-600 text-xl">←</button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Round Management</h1>
          <p className="text-sm text-slate-500">{drive?.companyName} — {drive?.jobRole}</p>
        </div>
      </div>

      {/* Funnel Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <FunnelNode label="Invited" count={funnelCounts['invited'] || 0} color="slate" />
          <Arrow />
          <FunnelNode label="Attended" count={funnelCounts['attended'] || 0} color="blue" />
          {rounds.map((r: any) => (
            <React.Fragment key={r.type}>
              <Arrow />
              <FunnelNode
                label={r.type.replace('_', ' ').toUpperCase()}
                count={funnelCounts[r.type] || 0}
                color={r.status === 'active' ? 'indigo' : r.status === 'completed' ? 'green' : 'slate'}
                active={r.status === 'active'}
              />
            </React.Fragment>
          ))}
          <Arrow />
          <FunnelNode label="Selected" count={funnelCounts['selected'] || 0} color="emerald" />
        </div>
      </div>

      {/* Round Cards */}
      <div className="space-y-4">
        {rounds.map((round: any) => (
          <RoundCard
            key={round.type}
            round={round}
            driveId={driveId!}
            uploadFile={uploadFile[round.type] || null}
            setUploadFile={(f: File | null) => setUploadFile(prev => ({ ...prev, [round.type]: f }))}
            result={roundResults[round.type]}
            uploading={uploading === round.type}
            onUpload={() => handleUploadResults(round.type)}
            navigate={navigate}
          />
        ))}
      </div>

      {/* Final Selection */}
      {allCompleted && (
        <div className="mt-6 bg-gradient-to-r from-indigo-50 to-emerald-50 rounded-xl border border-indigo-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-1">🏆 Final Selection</h3>
          <p className="text-sm text-slate-500 mb-4">
            Upload the final selected students list from {drive?.companyName}
          </p>

          <FinalDropzone file={finalFile} setFile={setFinalFile} />

          {finalFile && (
            <button onClick={handleFinalSelection} disabled={uploading === 'final'}
              className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-colors">
              {uploading === 'final' ? '⏳ Processing...' : '🎉 Process Final Selection'}
            </button>
          )}

          {finalResult && (
            <div className="mt-4 bg-white rounded-xl border p-4">
              <p className="text-green-600 font-bold text-lg">🎉 {finalResult.selected} students selected!</p>
              {finalResult.notFound > 0 && (
                <p className="text-amber-600 text-sm mt-1">⚠️ {finalResult.notFound} entries not matched</p>
              )}
              <p className="text-slate-500 text-xs mt-2">Congratulations notifications sent via Socket.io</p>
              <button onClick={viewSelected}
                className="mt-3 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-indigo-500 transition-colors">
                View Selected Students
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected Students Modal */}
      {showSelected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSelected(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">🎉 Selected Students ({selectedStudents.length})</h3>
              <button onClick={() => setShowSelected(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr><th className="text-left p-2">Name</th><th className="text-left p-2">USN</th><th className="text-left p-2">Branch</th><th className="text-left p-2">Email</th></tr>
              </thead>
              <tbody>
                {selectedStudents.map((s: any) => (
                  <tr key={s._id} className="border-t border-slate-100">
                    <td className="p-2 font-medium">{s.data?.fullName || s.data?.name}
                      <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded font-bold">SELECTED</span>
                    </td>
                    <td className="p-2 text-slate-500">{s.data?.usn || '-'}</td>
                    <td className="p-2 text-slate-500">{s.data?.branch || '-'}</td>
                    <td className="p-2 text-slate-500">{s.data?.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// === Sub-components ===

function FunnelNode({ label, count, color, active }: { label: string; count: number; color: string; active?: boolean }) {
  const colorMap: any = {
    slate: 'text-slate-800 bg-slate-50 border-slate-200',
    blue: 'text-blue-800 bg-blue-50 border-blue-200',
    indigo: 'text-indigo-800 bg-indigo-50 border-indigo-300',
    green: 'text-green-800 bg-green-50 border-green-200',
    emerald: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  };
  return (
    <div className={`px-4 py-3 rounded-xl border text-center min-w-[90px] ${colorMap[color] || colorMap.slate} ${active ? 'ring-2 ring-indigo-400 shadow-md' : ''}`}>
      <div className="text-2xl font-black">{count}</div>
      <div className="text-xs font-bold uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function Arrow() {
  return <span className="text-slate-300 text-lg font-bold flex-shrink-0">→</span>;
}

function RoundCard({ round, driveId, uploadFile, setUploadFile, result, uploading, onUpload, navigate }: any) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: (files) => { if (files[0]) setUploadFile(files[0]); }
  });

  const borderColor = round.status === 'active' ? 'border-indigo-400' : round.status === 'completed' ? 'border-green-400' : 'border-slate-200';
  const statusBadge = round.status === 'active'
    ? 'bg-indigo-100 text-indigo-700' : round.status === 'completed'
    ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500';

  return (
    <div className={`bg-white rounded-xl border-2 p-6 ${borderColor}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-slate-800">
            {round.type.replace('_', ' ').toUpperCase()}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${statusBadge}`}>
            {round.status}
          </span>
        </div>
      </div>

      {round.status === 'pending' && (
        <div className="text-slate-500 text-sm">
          <p className="mb-3">This round hasn't started yet. Assign rooms first.</p>
          <button onClick={() => navigate(`/admin/drives/${driveId}/room-assignment`)}
            className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-indigo-500">
            Go to Room Assignment →
          </button>
        </div>
      )}

      {round.status === 'active' && (
        <div>
          {/* Upload Dropzone */}
          <div className="bg-slate-50 rounded-xl p-4 mt-2">
            <h4 className="font-bold text-sm text-slate-700 mb-1">Upload Pass List</h4>
            <p className="text-xs text-slate-500 mb-3">Upload XLSX/CSV with USN or Email column of students who passed</p>
            <div {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300'
              }`}>
              <input {...getInputProps()} />
              {uploadFile ? (
                <p className="text-sm text-indigo-600 font-medium">📄 {uploadFile.name}</p>
              ) : (
                <p className="text-sm text-slate-400">Drop XLSX/CSV here or click to select</p>
              )}
            </div>
            {uploadFile && (
              <button onClick={onUpload} disabled={uploading}
                className="mt-3 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-indigo-500 transition-colors">
                {uploading ? '⏳ Processing...' : '📤 Upload & Process'}
              </button>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className="mt-4 bg-white border rounded-xl p-4">
              <p className="text-green-600 font-bold">✅ {result.passed} students PASSED</p>
              <p className="text-red-500 font-medium">❌ {result.failed} students FAILED</p>
              {result.notMatched > 0 && <p className="text-amber-600 text-sm">⚠️ {result.notMatched} rows not matched</p>}
              {result.nextRound && (
                <button onClick={() => navigate(`/admin/drives/${driveId}/room-assignment`)}
                  className="mt-3 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-indigo-500">
                  Assign Rooms for Next Round →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {round.status === 'completed' && (
        <div className="flex gap-3 mt-2">
          <button onClick={() => { window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/drives/${driveId}/rounds/${round.type}/export`, '_blank'); }}
            className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-lg text-sm hover:bg-slate-200 transition-colors">
            📥 Download XLSX
          </button>
        </div>
      )}
    </div>
  );
}

function FinalDropzone({ file, setFile }: { file: File | null; setFile: (f: File | null) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: (files) => { if (files[0]) setFile(files[0]); }
  });

  return (
    <div {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-indigo-300 hover:border-indigo-400'
      }`}>
      <input {...getInputProps()} />
      {file ? (
        <p className="text-indigo-600 font-medium">📄 {file.name}</p>
      ) : (
        <p className="text-slate-500">Drop final selection XLSX here or click to select</p>
      )}
    </div>
  );
}
