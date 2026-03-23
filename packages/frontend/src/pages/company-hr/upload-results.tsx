import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';

export default function HRUploadResults() {
  const user = useAuthStore(s => s.user);
  const [drive, setDrive] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const driveId = (user as any)?.driveId;

  useEffect(() => {
    document.title = 'Upload Results — HR Portal';
    if (driveId) {
      api.get(`/drives/${driveId}`).then((d: any) => { if (d.success) setDrive(d.data); });
    }
  }, [driveId]);

  const activeRound = drive?.rounds?.find((r: any) => r.status === 'active');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: (files) => { if (files[0]) setFile(files[0]); }
  });

  const handleUpload = async () => {
    if (!file || !activeRound) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data: any = await api.post(`/drives/${driveId}/rounds/${activeRound.type}/results`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.success) {
        setResult(data.data);
        toast.success('Results submitted!');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch { toast.error('Network error'); }
    setUploading(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Upload Round Results</h1>

      {/* Active Round Banner */}
      {activeRound ? (
        <div className="bg-indigo-600 text-white rounded-xl p-5 mb-6">
          <p className="text-indigo-200 text-sm font-medium">Currently Active</p>
          <h2 className="text-xl font-black mt-1">{activeRound.type.replace('_', ' ').toUpperCase()} ROUND</h2>
        </div>
      ) : (
        <div className="bg-slate-100 text-slate-600 rounded-xl p-5 mb-6 text-center">
          No active round at the moment.
        </div>
      )}

      {/* Dropzone */}
      {activeRound && !result && (
        <>
          <div {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-4 ${
              isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300 bg-white'
            }`}>
            <input {...getInputProps()} />
            {file ? (
              <p className="text-indigo-600 font-medium text-lg">📄 {file.name}</p>
            ) : (
              <>
                <p className="text-slate-500 text-lg mb-2">Drop your pass list here</p>
                <p className="text-slate-400 text-sm">XLSX or CSV with USN/Email column</p>
              </>
            )}
          </div>
          {file && (
            <button onClick={handleUpload} disabled={uploading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors text-lg">
              {uploading ? '⏳ Uploading...' : '📤 Confirm & Submit'}
            </button>
          )}
        </>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl border border-green-200 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-4">Results Submitted!</h3>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-2xl font-black text-green-700">{result.passed}</div>
              <div className="text-xs text-green-600 font-medium mt-1">PASSED</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-2xl font-black text-red-600">{result.failed}</div>
              <div className="text-xs text-red-500 font-medium mt-1">FAILED</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="text-2xl font-black text-amber-600">{result.notMatched}</div>
              <div className="text-xs text-amber-500 font-medium mt-1">NOT MATCHED</div>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-6">Admin has been notified of your submission.</p>
        </div>
      )}
    </div>
  );
}
