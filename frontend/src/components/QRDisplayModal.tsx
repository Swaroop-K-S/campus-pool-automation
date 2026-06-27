import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { X, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface QRDisplayModalProps {
  driveId: string;
  driveName: string;
  qrType: string;
  initialSecret: string;
  onClose: () => void;
}

export default function QRDisplayModal({ driveId, driveName, qrType, initialSecret, onClose }: QRDisplayModalProps) {
  const [secret, setSecret] = useState(initialSecret);
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError] = useState('');
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (qrType !== 'dynamic') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          rotateSecret();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrType]);

  const rotateSecret = async () => {
    setRotating(true);
    try {
      const res = await fetch(`/api/v1/drives/${driveId}/rotate-qr`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSecret(data.current_qr_secret);
        setError('');
      } else {
        setError('Failed to rotate QR secret');
      }
    } catch (err) {
      setError('Network error while rotating QR');
    } finally {
      setRotating(false);
    }
  };

  const qrData = JSON.stringify({
    drive_id: driveId,
    qr_secret: secret,
  });

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full flex items-center justify-center transition-colors shadow-sm"
      >
        <X size={24} />
      </button>

      <div className="bg-card border border-border rounded-3xl p-10 max-w-lg w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent"></div>

        <h2 className="text-3xl font-black text-foreground mb-2 relative z-10">{driveName}</h2>
        <p className="text-muted-foreground mb-8 relative z-10 flex items-center gap-2">
          Scan this QR to check in
          {qrType === 'dynamic' && (
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-md text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <RefreshCw size={12} className={rotating ? "animate-spin" : ""} /> Dynamic
            </span>
          )}
        </p>

        {error && (
          <div className="w-full mb-6 p-3 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl shadow-inner mb-8 relative flex items-center justify-center">
          <QRCode 
            value={qrData}
            size={280}
            level="H"
            className="rounded-lg"
          />
          {rotating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-20">
              <Loader2 size={40} className="animate-spin text-primary" />
            </div>
          )}
        </div>

        {qrType === 'dynamic' && (
          <div className="w-full">
            <div className="flex justify-between items-center text-sm font-medium mb-2">
              <span className="text-muted-foreground">Refreshing in...</span>
              <span className={`font-bold ${timeLeft <= 5 ? 'text-destructive' : 'text-foreground'}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ease-linear rounded-full ${timeLeft <= 5 ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
