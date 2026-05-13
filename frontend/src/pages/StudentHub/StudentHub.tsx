import { useState, useEffect } from 'react';
import { QrCode, Bell, Map, User, CheckCircle2, Navigation, AlertCircle, ScanLine } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function StudentHub() {
  const [activeTab, setActiveTab] = useState('roadmap');
  const [isSummoned, setIsSummoned] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  
  // Fake summon after 5 seconds to demonstrate Hall Pass
  useEffect(() => {
    const timer = setTimeout(() => {
      // setIsSummoned(true);
      // if (navigator.vibrate) {
      //   navigator.vibrate([200, 100, 200, 100, 500]); // Haptic feedback
      // }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

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
          // Here we would call the backend API: POST /api/v1/students/check-in
          setTimeout(() => {
            // After successful checkin, go back to roadmap
            setActiveTab('roadmap');
          }, 1500);
        },
        (_error) => {
          // ignore continuous scanning errors
        }
      );

      return () => {
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      };
    }
  }, [activeTab, scanResult]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative flex flex-col">
      {/* Decorative top header bar */}
      <div className="absolute top-0 left-0 w-full h-2 bg-primary z-50"></div>

      {/* Header */}
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

      {/* Main Content Area */}
      <main className="flex-1 px-6 py-6 pb-24 relative z-10 overflow-y-auto bg-secondary/30">
        {/* Profile Card */}
        <div className="bg-card border border-border border-t-[4px] border-t-primary rounded-xl p-6 mb-8 shadow-md relative overflow-hidden">
          <p className="text-sm text-muted-foreground mb-1 font-medium">Candidate ID: TCS-8942</p>
          <h2 className="text-2xl font-bold text-foreground mb-4">Swaroop K S</h2>
          
          <div className="flex justify-between items-end">
            <div className="bg-secondary/50 border border-border rounded-xl p-3 inline-block">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Queue Position</p>
              <div className="flex items-baseline">
                <span className="text-3xl font-black text-foreground">#14</span>
                <span className="text-sm text-muted-foreground ml-2">/ 450</span>
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

        {/* Tab Content: Roadmap */}
        {activeTab === 'roadmap' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center">
              <Map size={18} className="mr-2 text-primary" />
              Live Roadmap
            </h3>
            
            <div className="relative pl-4 space-y-8">
              {/* Vertical Line */}
              <div className="absolute left-7 top-2 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500 via-primary to-border"></div>
              
              {/* Step 1: Completed */}
              <div className="relative flex items-start">
                <div className="absolute left-0 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(16,185,129,0.3)] border-2 border-background">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <div className="ml-12 w-full">
                  <h4 className="text-lg font-bold text-foreground">Pre-Placement Talk</h4>
                  <p className="text-sm text-muted-foreground">Main Auditorium • 9:00 AM</p>
                </div>
              </div>

              {/* Step 2: Active */}
              <div className="relative flex items-start">
                <div className="absolute left-0 w-7 h-7 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10 shadow-sm">
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-ping"></div>
                </div>
                <div className="ml-12 w-full bg-card shadow-sm border border-border border-l-4 border-l-primary rounded-xl p-4 relative overflow-hidden">
                  <h4 className="text-lg font-bold text-foreground">Aptitude Test</h4>
                  <p className="text-sm text-muted-foreground mb-3">You are in the queue.</p>
                  <div className="flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full inline-flex border border-amber-200">
                    <AlertCircle size={14} className="mr-1.5" />
                    Wait for summons
                  </div>
                </div>
              </div>

              {/* Step 3: Pending */}
              <div className="relative flex items-start opacity-50">
                <div className="absolute left-0 w-7 h-7 rounded-full bg-background border-2 border-border flex items-center justify-center z-10">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                </div>
                <div className="ml-12 w-full">
                  <h4 className="text-lg font-bold text-muted-foreground">Technical Interview</h4>
                  <p className="text-sm text-muted-foreground">To be announced</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Passport / QR Scanner */}
        {activeTab === 'passport' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center self-start">
              <ScanLine size={18} className="mr-2 text-primary" />
              Scan to Check-In
            </h3>
            
            <div className="w-full max-w-sm bg-card border border-border rounded-xl p-4 shadow-md">
              {scanResult ? (
                <div className="text-center py-12">
                  <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-4 animate-bounce" />
                  <h4 className="text-xl font-bold text-foreground">Code Scanned!</h4>
                  <p className="text-muted-foreground mt-2">Checking you in...</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  {/* html5-qrcode binds to this ID */}
                  <div id="qr-reader" className="w-full bg-secondary"></div>
                </div>
              )}
            </div>
            
            <p className="text-muted-foreground text-sm mt-6 text-center">
              Scan the QR code displayed at the room entrance or on the invigilator's screen.
            </p>
          </div>
        )}

        {/* Tab Content: Alerts */}
        {activeTab === 'alerts' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center">
              <Bell size={18} className="mr-2 text-destructive" />
              Live Announcements
            </h3>
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-destructive text-xs font-bold uppercase tracking-wider">Urgent</span>
                  <span className="text-muted-foreground text-xs">10 mins ago</span>
                </div>
                <p className="text-foreground text-sm">The Aptitude test for Batch A will begin at exactly 10:30 AM. Please ensure you have checked in.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Digital Hall Pass Overlay (Summoned State) */}
      {isSummoned && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
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
              <p className="text-3xl font-black text-foreground">Lab 4</p>
              <p className="text-sm text-muted-foreground mt-2 font-medium">3rd Floor, Main Block</p>
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

      {/* Bottom Navigation */}
      <nav className="bg-card border-t border-border px-6 py-4 fixed bottom-0 w-full z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <ul className="flex justify-between items-center max-w-md mx-auto">
          <li>
            <button 
              onClick={() => setActiveTab('roadmap')}
              className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'roadmap' ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Map size={24} className={activeTab === 'roadmap' ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-medium mt-1">Roadmap</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('passport')}
              className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'passport' ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <QrCode size={24} className={activeTab === 'passport' ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-medium mt-1">Check-in</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('alerts')}
              className={`flex flex-col items-center p-2 transition-colors relative ${activeTab === 'alerts' ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <div className="relative">
                <Bell size={24} className={activeTab === 'alerts' ? 'fill-primary/20' : ''} />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card"></span>
              </div>
              <span className="text-[10px] font-medium mt-1">Alerts</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
