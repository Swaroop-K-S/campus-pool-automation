import { useState, useEffect } from 'react';
import { QrCode, Bell, Map, User, CheckCircle2, Navigation, AlertCircle, ScanLine, Smartphone } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useSearchParams } from 'react-router-dom';

interface LiveStatus {
  status: str;
  current_room_id: str | null;
  room_name: str | null;
  queue_position: number | null;
  push_enabled: boolean;
}

// Utility to convert Base64 URL-safe to Uint8Array for VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function StudentHub() {
  const [searchParams] = useSearchParams();
  const uniqueId = searchParams.get('id') || 'TEST-123';
  
  const [activeTab, setActiveTab] = useState('roadmap');
  const [isSummoned, setIsSummoned] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Polling for live status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/v1/students/${uniqueId}/live-status`);
        if (res.ok) {
          const data = await res.json();
          setLiveStatus(data);
          setPushEnabled(data.push_enabled);
          
          // If allocated to a room, summon them
          if (data.current_room_id && data.status !== 'placed' && data.status !== 'rejected') {
            setIsSummoned(true);
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 500]);
            }
          } else {
            setIsSummoned(false);
          }
        }
      } catch (e) {
        console.error("Failed to fetch live status", e);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [uniqueId]);

  // Subscribe to Push Notifications
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert("Push notifications are not supported by your browser.");
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("Permission denied");
        return;
      }
      
      const registration = await navigator.serviceWorker.ready;
      
      // Get public VAPID key
      const keyRes = await fetch('/api/v1/push/vapid-public-key');
      if (!keyRes.ok) throw new Error("Could not fetch VAPID key");
      const { public_key } = await keyRes.json();
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key)
      });
      
      // Save subscription
      const saveRes = await fetch(`/api/v1/push/subscribe/${uniqueId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
      if (saveRes.ok) {
        setPushEnabled(true);
        alert("Push notifications enabled!");
      }
    } catch (e) {
      console.error("Error subscribing to push", e);
      alert("Failed to enable push notifications.");
    }
  };

  // QR Scanner Initialization
  useEffect(() => {
    if (activeTab === 'passport' && !scanResult) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (decodedText) => {
          setScanResult(decodedText);
          try {
            await scanner.clear();
          } catch (e) {
            console.error(e);
          }
          setTimeout(() => setActiveTab('roadmap'), 1500);
        },
        (_error) => {}
      );

      return () => {
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      };
    }
  }, [activeTab, scanResult]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative flex flex-col">
      <div className="absolute top-0 left-0 w-full h-2 bg-primary z-50"></div>

      <header className="flex justify-between items-center p-6 pt-8 relative z-10 bg-card border-b border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CampusPool</h1>
          <div className="flex items-center mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="text-xs text-muted-foreground font-medium tracking-wide">LIVE SYNCHRONIZED</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center shadow-sm">
          <User size={20} className="text-foreground" />
        </div>
      </header>

      <main className="flex-1 px-6 py-6 pb-24 relative z-10 overflow-y-auto bg-secondary/30">
        
        {!pushEnabled && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-primary/20 p-2 rounded-full mr-3">
                <Smartphone size={20} className="text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Turn on Alerts</h4>
                <p className="text-xs text-muted-foreground">Get notified when it's your turn</p>
              </div>
            </div>
            <button onClick={subscribeToPush} className="bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg">
              Enable
            </button>
          </div>
        )}

        <div className="bg-card border border-border border-t-[4px] border-t-primary rounded-xl p-6 mb-8 shadow-md relative overflow-hidden">
          <p className="text-sm text-muted-foreground mb-1 font-medium">Candidate ID: {uniqueId}</p>
          <h2 className="text-2xl font-bold text-foreground mb-4">Welcome!</h2>
          
          <div className="flex justify-between items-end">
            <div className="bg-secondary/50 border border-border rounded-xl p-3 inline-block">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Current Status</p>
              <div className="flex items-baseline">
                <span className="text-xl font-black text-foreground capitalize">{liveStatus?.status || 'Loading...'}</span>
              </div>
            </div>
            
            <button 
              onClick={() => setActiveTab('passport')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-md"
            >
              <QrCode size={24} />
            </button>
          </div>
        </div>

        {activeTab === 'roadmap' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center">
              <Map size={18} className="mr-2 text-primary" />
              Live Tracker
            </h3>
            
            <div className="relative pl-4 space-y-8">
              <div className="absolute left-7 top-2 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500 via-primary to-border"></div>
              
              <div className="relative flex items-start">
                <div className="absolute left-0 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(16,185,129,0.3)] border-2 border-background">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <div className="ml-12 w-full">
                  <h4 className="text-lg font-bold text-foreground">Registered</h4>
                  <p className="text-sm text-muted-foreground">Check-in at front desk</p>
                </div>
              </div>

              {liveStatus?.current_room_id ? (
                <div className="relative flex items-start">
                  <div className="absolute left-0 w-7 h-7 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10 shadow-sm">
                    <div className="w-2.5 h-2.5 bg-primary rounded-full animate-ping"></div>
                  </div>
                  <div className="ml-12 w-full bg-card shadow-sm border border-border border-l-4 border-l-primary rounded-xl p-4 relative overflow-hidden">
                    <h4 className="text-lg font-bold text-foreground">Room Allocated!</h4>
                    <p className="text-sm text-muted-foreground mb-3">Please proceed to {liveStatus.room_name || 'your assigned room'}.</p>
                    <div className="flex items-center text-xs font-medium text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full inline-flex border border-emerald-200">
                      <Navigation size={14} className="mr-1.5" />
                      Proceed Now
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative flex items-start">
                  <div className="absolute left-0 w-7 h-7 rounded-full bg-background border-2 border-amber-500 flex items-center justify-center z-10 shadow-sm">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="ml-12 w-full bg-card shadow-sm border border-border border-l-4 border-l-amber-500 rounded-xl p-4 relative overflow-hidden">
                    <h4 className="text-lg font-bold text-foreground">In Queue</h4>
                    <p className="text-sm text-muted-foreground mb-3">Wait for your room allocation.</p>
                    <div className="flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full inline-flex border border-amber-200">
                      <AlertCircle size={14} className="mr-1.5" />
                      Wait for summons
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'passport' && (
          <div className="animate-in fade-in flex flex-col items-center">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center self-start">
              <ScanLine size={18} className="mr-2 text-primary" />
              Scan to Check-In
            </h3>
            
            <div className="w-full max-w-sm bg-card border border-border rounded-xl p-4 shadow-md">
              {scanResult ? (
                <div className="text-center py-12">
                  <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-4 animate-bounce" />
                  <h4 className="text-xl font-bold text-foreground">Code Scanned!</h4>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div id="qr-reader" className="w-full bg-secondary"></div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="animate-in fade-in">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center">
              <Bell size={18} className="mr-2 text-destructive" />
              Live Announcements
            </h3>
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-primary text-xs font-bold uppercase tracking-wider">System</span>
                </div>
                <p className="text-foreground text-sm">Welcome to CampusPool. Stay on this page for live updates.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {isSummoned && liveStatus?.room_name && (
        <div className="absolute inset-0 z-[100] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-card w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-border text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping opacity-20"></div>
              <Navigation size={32} className="text-primary" />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-2">You are Summoned</h2>
            <p className="text-muted-foreground mb-8">Your turn has arrived. Please proceed to your allocated room immediately.</p>
            
            <div className="bg-secondary/50 rounded-2xl p-6 mb-8 border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Destination</p>
              <p className="text-3xl font-black text-foreground">{liveStatus.room_name}</p>
            </div>
            
            <button 
              onClick={() => {
                setIsSummoned(false);
                setActiveTab('passport');
              }}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center shadow-md hover:-translate-y-1 transition-all"
            >
              Scan Check-in QR
            </button>
          </div>
        </div>
      )}

      <nav className="bg-card border-t border-border px-6 py-4 fixed bottom-0 w-full z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <ul className="flex justify-between items-center max-w-md mx-auto">
          <li>
            <button onClick={() => setActiveTab('roadmap')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'roadmap' ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}`}>
              <Map size={24} className={activeTab === 'roadmap' ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-medium mt-1">Roadmap</span>
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('passport')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'passport' ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}`}>
              <QrCode size={24} className={activeTab === 'passport' ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-medium mt-1">Check-in</span>
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('alerts')} className={`flex flex-col items-center p-2 transition-colors relative ${activeTab === 'alerts' ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}`}>
              <Bell size={24} className={activeTab === 'alerts' ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-medium mt-1">Alerts</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
