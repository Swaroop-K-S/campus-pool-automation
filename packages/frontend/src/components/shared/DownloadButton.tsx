import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface DownloadButtonProps {
  url: string;
  filename?: string;
  label?: string;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
}

export const DownloadButton = ({
  url, filename, label = 'Download XLSX',
  variant = 'outline', size = 'md'
}: DownloadButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const fullUrl = url.startsWith('http') ? url : `${apiBase}${url.startsWith('/') ? url : '/' + url}`;

      const response = await fetch(fullUrl, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Download failed');

      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+?)"/);
      const fname = filename || match?.[1] || 'export.xlsx';

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      toast.success('Downloaded successfully!');
    } catch {
      toast.error('Download failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm';

  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
    outline: 'border border-slate-200 hover:bg-slate-50 text-slate-700',
    ghost: 'hover:bg-slate-100 text-slate-600'
  }[variant];

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`flex items-center gap-2 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses}`}
    >
      {loading
        ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin" />
        : <Download size={size === 'sm' ? 13 : 15} />
      }
      {loading ? 'Downloading...' : label}
    </button>
  );
};
