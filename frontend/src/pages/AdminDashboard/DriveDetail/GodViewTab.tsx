import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PlayCircle, Users, CheckCircle, Clock } from 'lucide-react';

export default function GodViewTab() {
  const { id } = useParams();
  const [isRunningEngine, setIsRunningEngine] = useState(false);
  const [allocationComplete, setAllocationComplete] = useState(false);

  const handleRunEngine = async () => {
    setIsRunningEngine(true);
    try {
      // Trigger the "Butter" logistics engine
      const res = await fetch(`/api/v1/drives/${id}/allocate-rooms`, { method: 'POST' });
      if (res.ok) {
        setAllocationComplete(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningEngine(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl shadow-md border border-border border-b-[3px] border-b-primary flex items-center transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-4">
            <Users size={24} />
          </div>
          <div>
            <p className="text-muted-foreground font-medium text-sm">Total Shortlisted</p>
            <p className="text-2xl font-bold text-foreground">450</p>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-md border border-border border-b-[3px] border-b-emerald-500 flex items-center transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mr-4">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-muted-foreground font-medium text-sm">Checked In</p>
            <p className="text-2xl font-bold text-foreground">120 <span className="text-sm font-normal text-muted-foreground">/ 450</span></p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow-md border border-border border-b-[3px] border-b-secondary flex items-center transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary-foreground flex items-center justify-center mr-4">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-muted-foreground font-medium text-sm">Pending Arrival</p>
            <p className="text-2xl font-bold text-foreground">330</p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center bg-background">
          <div>
            <h2 className="text-lg font-bold text-foreground">Round 1 Logistics</h2>
            <p className="text-sm text-muted-foreground">Manage room allocation for the Aptitude Test</p>
          </div>
          <button 
            onClick={handleRunEngine}
            disabled={isRunningEngine || allocationComplete}
            className={`px-5 py-2.5 rounded-lg font-medium flex items-center transition-colors shadow-sm ${
              allocationComplete 
                ? 'bg-emerald-500/20 text-emerald-500 cursor-default'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--color-primary),0.3)]'
            }`}
          >
            {allocationComplete ? (
              <>
                <CheckCircle size={18} className="mr-2" />
                Allocation Complete
              </>
            ) : (
              <>
                <PlayCircle size={18} className="mr-2" />
                {isRunningEngine ? 'Running Engine...' : 'Run Assignment Engine'}
              </>
            )}
          </button>
        </div>

        {/* Room Heatmap */}
        <div className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Room Heatmap</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Mock Rooms */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-border rounded-lg p-4 bg-background shadow-sm hover:border-primary transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-bold text-foreground">Lab {i}</span>
                  <span className="text-xs font-medium px-2 py-1 bg-card text-muted-foreground rounded border border-border">Cap: 60</span>
                </div>
                
                <div className="w-full bg-card rounded-full h-2 mb-2 border border-border/50">
                  <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: allocationComplete ? `${40 + i * 10}%` : '0%' }}></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{allocationComplete ? 24 + i * 6 : 0} Allocated</span>
                  <span>{60 - (allocationComplete ? 24 + i * 6 : 0)} Free</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
