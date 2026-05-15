import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlayCircle, Users, CheckCircle, Clock, Plus, X } from 'lucide-react';

export default function GodViewTab() {
  const { id } = useParams();
  const [isRunningEngine, setIsRunningEngine] = useState(false);
  const [allocationComplete, setAllocationComplete] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_shortlisted: 0, checked_in: 0, pending_arrival: 0 });
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 60 });

  const fetchStatsAndRooms = async () => {
    try {
      const statsRes = await fetch(`/api/v1/drives/${id}/stats/god-view`);
      if (statsRes.ok) setStats(await statsRes.json());

      const roomsRes = await fetch(`/api/v1/drives/${id}/rooms`);
      if (roomsRes.ok) setRooms(await roomsRes.json());
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  useEffect(() => {
    fetchStatsAndRooms();
    const interval = setInterval(fetchStatsAndRooms, 5000); // Polling for real-time updates
    return () => clearInterval(interval);
  }, [id]);

  const handleRunEngine = async () => {
    setIsRunningEngine(true);
    try {
      const res = await fetch(`/api/v1/drives/${id}/allocate-rooms`, { method: 'POST' });
      if (res.ok) {
        setAllocationComplete(true);
        fetchStatsAndRooms();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningEngine(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name) return;
    try {
      const res = await fetch(`/api/v1/drives/${id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom),
      });
      if (res.ok) {
        setShowAddRoom(false);
        setNewRoom({ name: '', capacity: 60 });
        fetchStatsAndRooms();
      }
    } catch (e) {
      console.error("Failed to add room", e);
    }
  };

  const inputCls = 'w-full bg-background border border-border text-foreground rounded-lg p-2.5 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all text-sm';
  const labelCls = 'block text-sm font-semibold text-foreground mb-1.5';

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
            <p className="text-2xl font-bold text-foreground">{stats.total_shortlisted}</p>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-md border border-border border-b-[3px] border-b-emerald-500 flex items-center transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mr-4">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-muted-foreground font-medium text-sm">Checked In</p>
            <p className="text-2xl font-bold text-foreground">{stats.checked_in} <span className="text-sm font-normal text-muted-foreground">/ {stats.total_shortlisted}</span></p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow-md border border-border border-b-[3px] border-b-secondary flex items-center transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary-foreground flex items-center justify-center mr-4">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-muted-foreground font-medium text-sm">Pending Arrival</p>
            <p className="text-2xl font-bold text-foreground">{stats.pending_arrival}</p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center bg-background">
          <div>
            <h2 className="text-lg font-bold text-foreground">Round Logistics</h2>
            <p className="text-sm text-muted-foreground">Manage room allocation and tracking</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddRoom(true)}
              className="px-4 py-2.5 rounded-lg font-medium flex items-center transition-colors bg-secondary/20 text-secondary-foreground hover:bg-secondary/30"
            >
              <Plus size={18} className="mr-2" />
              Add Room
            </button>
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
        </div>

        {/* Room Heatmap */}
        <div className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Room Heatmap</h3>
          {rooms.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No rooms added yet. Click "Add Room" to configure physical rooms.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {rooms.map((room) => {
                const percentage = room.capacity > 0 ? (room.current_occupancy / room.capacity) * 100 : 0;
                return (
                  <div key={room.id} className="border border-border rounded-lg p-4 bg-background shadow-sm hover:border-primary transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-bold text-foreground">{room.name}</span>
                      <span className="text-xs font-medium px-2 py-1 bg-card text-muted-foreground rounded border border-border">Cap: {room.capacity}</span>
                    </div>
                    
                    <div className="w-full bg-card rounded-full h-2 mb-2 border border-border/50 overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{room.current_occupancy} Allocated</span>
                      <span>{room.capacity - room.current_occupancy} Free</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-foreground">Add New Room</h2>
              <button onClick={() => setShowAddRoom(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div>
                <label className={labelCls}>Room Name / Label</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="e.g. Lab 1" 
                  className={inputCls}
                  value={newRoom.name}
                  onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                />
              </div>
              <div>
                <label className={labelCls}>Capacity (Seats)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  className={inputCls}
                  value={newRoom.capacity}
                  onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddRoom(false)} className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
