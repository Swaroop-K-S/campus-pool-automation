import { useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

export default function ShortlistTab() {
  const { id } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ students_added?: number; message?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
      setResult(null);
      setErrorMsg('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/v1/drives/${id}/shortlist/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
        setUploadStatus('success');
      } else {
        setErrorMsg(data.detail || 'Upload failed. Please try again.');
        setUploadStatus('error');
      }
    } catch (error) {
      setErrorMsg('Network error. Is the backend running?');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="bg-card rounded-xl shadow-md border border-border border-b-[3px] border-b-primary overflow-hidden">
      <div className="p-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">Upload Shortlist</h2>
        <p className="text-muted-foreground mb-8">Upload the `.xlsx` file containing the shortlisted students for this drive.</p>
        
        <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center bg-background transition-colors hover:bg-secondary/20">
          {uploadStatus === 'success' ? (
            <div className="text-center">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Upload Successful</h3>
              {result?.students_added !== undefined && (
                <p className="text-3xl font-black text-primary mt-2">{result.students_added}</p>
              )}
              <p className="text-muted-foreground mt-1">{result?.message || 'The student data has been parsed and saved.'}</p>
              <button
                onClick={() => {setFile(null); setUploadStatus('idle'); setResult(null);}}
                className="mt-6 text-primary font-medium hover:underline"
              >
                Upload another file
              </button>
            </div>
          ) : (
            <>
              {uploadStatus === 'error' && errorMsg && (
                <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm w-full text-center">
                  ⚠ {errorMsg}
                </div>
              )}
              <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                {file ? <FileSpreadsheet size={32} /> : <UploadCloud size={32} />}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {file ? file.name : 'Drag & drop your file here'}
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                {file ? `${(file.size / 1024).toFixed(2)} KB` : 'Supports: .xlsx, .xls'}
              </p>
              
              <div className="flex gap-4">
                <label className="px-6 py-2.5 bg-card border border-border text-foreground font-medium rounded-lg hover:bg-secondary cursor-pointer transition-colors shadow-sm">
                  <span>Choose File</span>
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} />
                </label>
                
                <button 
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className={`px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm ${
                    !file || isUploading
                      ? 'bg-secondary/50 text-muted-foreground/50 cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--color-primary),0.3)]'
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Upload Data'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
