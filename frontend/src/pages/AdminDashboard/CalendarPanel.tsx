import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { Calendar, ChevronLeft, ChevronRight, Download, RefreshCw, Activity, Loader2, AlertCircle } from 'lucide-react';

interface Drive {
  id: string;
  company_name: string;
  package_offered: string | null;
  locations: string[];
  drive_date: string | null;
  status: 'draft' | 'active' | 'event_day' | 'completed';
  created_at: string;
}

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  draft: {
    bg: 'bg-slate-100 hover:bg-slate-200/80',
    border: 'border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400'
  },
  active: {
    bg: 'bg-emerald-50/80 hover:bg-emerald-100/80',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500 animate-pulse'
  },
  event_day: {
    bg: 'bg-amber-50/80 hover:bg-amber-100/80',
    border: 'border-amber-250',
    text: 'text-amber-800',
    dot: 'bg-red-500 animate-ping'
  },
  completed: {
    bg: 'bg-indigo-50/80 hover:bg-indigo-100/80',
    border: 'border-indigo-200',
    text: 'text-indigo-800',
    dot: 'bg-primary'
  }
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarPanel() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchDrives = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/drives/');
      if (!res.ok) throw new Error('Failed to load drive schedules');
      const data = await res.json();
      setDrives(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Helper to change month
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  // Get days structure
  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 is Sunday
    
    const daysArray: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Padding days from previous month
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      daysArray.push({
        date: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }
    
    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push({
        date: new Date(currentYear, currentMonth, i),
        isCurrentMonth: true
      });
    }
    
    // Padding days for next month to fill 6-row grid (42 cells)
    const remainingCells = 42 - daysArray.length;
    for (let i = 1; i <= remainingCells; i++) {
      daysArray.push({
        date: new Date(currentYear, currentMonth + 1, i),
        isCurrentMonth: false
      });
    }
    
    return daysArray;
  };

  const handleExportICS = () => {
    window.open('/api/v1/calendar/export', '_blank');
  };

  const [syncStatus, setSyncStatus] = useState<string>('');

  const syncToGoogleCalendar = async (accessToken: string) => {
    setIsSyncing(true);
    setSyncStatus('Checking calendars...');

    try {
      // 1. Fetch user calendar list to check if our custom calendar exists
      const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!listRes.ok) throw new Error('Failed to retrieve Google Calendar list.');
      const calendarList = await listRes.json();
      
      let calendarId = '';
      const campusPoolCal = calendarList.items?.find(
        (c: any) => c.summary === 'CampusPool Placement Schedule'
      );
      
      if (campusPoolCal) {
        calendarId = campusPoolCal.id;
        setSyncStatus('Connecting existing calendar...');
      } else {
        setSyncStatus('Creating CampusPool calendar...');
        const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ summary: 'CampusPool Placement Schedule' }),
        });
        if (!createRes.ok) throw new Error('Failed to create CampusPool calendar.');
        const newCal = await createRes.json();
        calendarId = newCal.id;
      }

      // 2. Sync scheduled drives
      const scheduledDrives = drives.filter((d) => d.drive_date);
      let count = 0;
      
      for (const d of scheduledDrives) {
        count++;
        setSyncStatus(`Syncing ${count}/${scheduledDrives.length}: ${d.company_name}`);

        const driveDate = new Date(d.drive_date!);
        
        // Define event times (09:00 AM - 05:00 PM)
        const start = new Date(driveDate);
        start.setHours(9, 0, 0, 0);
        const end = new Date(driveDate);
        end.setHours(17, 0, 0, 0);

        const eventResource = {
          id: d.id, // Hex ObjectId serves as idempotent key
          summary: `Placement Drive: ${d.company_name}`,
          description: `Company: ${d.company_name}\nPackage Offered: ${d.package_offered ? d.package_offered + ' LPA' : 'TBD'}\nStatus: ${d.status.toUpperCase()}\nLocations: ${d.locations.join(', ') || 'TBD'}\nDashboard Link: http://localhost:5173/admin/drives/${d.id}`,
          location: d.locations.join(', ') || 'TBD',
          start: {
            dateTime: start.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: end.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        };

        // Try PUT (update if exists)
        const updateRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${d.id}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventResource),
          }
        );

        if (updateRes.status === 404) {
          // If 404, insert new event with pre-defined ID
          const createEventRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(eventResource),
            }
          );
          if (!createEventRes.ok) {
            console.error(`Failed to create event for ${d.company_name}`);
          }
        } else if (!updateRes.ok) {
          console.error(`Failed to update event for ${d.company_name}`);
        }
      }

      setSyncStatus('');
      setIsSyncing(false);
      alert(`Google Calendar Sync Complete!\nSynchronized ${scheduledDrives.length} drives to 'CampusPool Placement Schedule'.`);
    } catch (err: any) {
      console.error(err);
      alert(`Sync Failed: ${err.message || 'Unknown calendar sync error.'}`);
      setSyncStatus('');
      setIsSyncing(false);
    }
  };

  const handleGoogleSync = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      syncToGoogleCalendar(tokenResponse.access_token);
    },
    onError: (error) => {
      console.error(error);
      alert('Google OAuth Consent Flow failed or cancelled.');
    },
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar',
  });

  // Group drives by date YYYY-MM-DD
  const drivesByDate: Record<string, Drive[]> = {};
  drives.forEach(d => {
    if (d.drive_date) {
      const dateKey = new Date(d.drive_date).toISOString().split('T')[0];
      if (!drivesByDate[dateKey]) {
        drivesByDate[dateKey] = [];
      }
      drivesByDate[dateKey].push(d);
    }
  });

  const getDrivesForDate = (date: Date) => {
    const key = date.toISOString().split('T')[0];
    return drivesByDate[key] || [];
  };

  const checkIsToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Filter drives for current month (for sidebar listing)
  const currentMonthDrives = drives.filter(d => {
    if (!d.drive_date) return false;
    const date = new Date(d.drive_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={36} className="animate-spin text-primary mb-3" />
        <span className="font-medium text-sm">Loading calendar...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center max-w-lg mx-auto">
        <AlertCircle className="mx-auto text-destructive mb-3" size={36} />
        <h3 className="text-base font-semibold text-foreground mb-1">Failed to Load Calendar</h3>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <button
          onClick={fetchDrives}
          className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90 flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  const calendarDays = getDaysInMonth();

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendar Grid Container */}
      <div className="flex-1 bg-card border border-border border-b-[3px] border-b-primary rounded-xl p-6 shadow-md">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
              <Calendar className="text-primary" size={24} />
              Placement Schedule
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visual monthly calendar view of active drives
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleGoogleSync()}
              disabled={isSyncing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold rounded-lg text-xs transition-colors border border-border disabled:opacity-60 shadow-sm min-w-[180px]"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? (syncStatus || 'Syncing...') : 'Sync Google Calendar'}
            </button>

            <button
              onClick={handleExportICS}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-lg text-xs transition-colors shadow-sm"
            >
              <Download size={14} />
              Export to Calendar (.ics)
            </button>
          </div>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center justify-between bg-secondary/35 rounded-xl border border-border/80 p-3 mb-6">
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border transition-all text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border transition-all text-muted-foreground hover:text-foreground"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <h3 className="text-lg font-bold text-foreground tracking-wide">
            {MONTHS[currentMonth]} {currentYear}
          </h3>

          <button
            onClick={setToday}
            className="px-3.5 py-1.5 bg-card hover:bg-secondary/20 border border-border text-foreground font-semibold rounded-lg text-xs transition-all active:scale-95 shadow-sm"
          >
            Today
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 border-t border-l border-border rounded-lg overflow-hidden shadow-inner">
          {/* Weekday Names */}
          {WEEKDAYS.map(day => (
            <div
              key={day}
              className="bg-secondary/40 border-r border-b border-border py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {/* Days Grid */}
          {calendarDays.map((day, idx) => {
            const drives = getDrivesForDate(day.date);
            const isToday = checkIsToday(day.date);
            
            return (
              <div
                key={idx}
                className={`min-h-[105px] border-r border-b border-border p-2 flex flex-col justify-between transition-colors
                  ${day.isCurrentMonth ? 'bg-card' : 'bg-secondary/15 text-muted-foreground/60'}
                  ${isToday ? 'ring-2 ring-primary/60 ring-inset bg-primary/5' : ''}`}
              >
                {/* Date header cell */}
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-primary text-primary-foreground shadow-sm' : ''}
                    ${day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                    {day.date.getDate()}
                  </span>
                  
                  {drives.length > 0 && (
                    <span className="text-[10px] font-bold text-muted-foreground/75 px-1 bg-secondary rounded border border-border/80">
                      {drives.length} Drive{drives.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Badges / Drives list */}
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[70px] no-scrollbar">
                  {drives.map(d => {
                    const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.draft;
                    
                    return (
                      <Link
                        key={d.id}
                        to={`/admin/drives/${d.id}`}
                        className={`text-[10px] font-bold px-2 py-1 rounded border ${cfg.border} ${cfg.bg} ${cfg.text} transition-colors flex items-center gap-1.5 truncate shadow-sm`}
                        title={`${d.company_name} (${d.status.replace('_', ' ').toUpperCase()})`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                        <span className="truncate">{d.company_name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Month Summary Sidebar */}
      <div className="w-full lg:w-80 bg-card border border-border border-b-[3px] border-b-primary rounded-xl p-6 shadow-md flex flex-col">
        <h3 className="font-bold text-foreground text-base mb-4 flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          Drives in {MONTHS[currentMonth]}
        </h3>

        {currentMonthDrives.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            <p className="text-xs italic font-medium">No drives scheduled this month.</p>
            <Link
              to="/admin/drives/new"
              className="text-xs text-primary font-bold hover:underline mt-2 inline-block"
            >
              + Add a Drive
            </Link>
          </div>
        ) : (
          <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[480px] pr-1">
            {currentMonthDrives.map(d => {
              const driveDateStr = new Date(d.drive_date!).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              });
              const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.draft;

              return (
                <Link
                  key={d.id}
                  to={`/admin/drives/${d.id}`}
                  className="block p-3.5 bg-background border border-border hover:border-primary rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {driveDateStr}
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.bg} ${cfg.text}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                    {d.company_name}
                  </h4>
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40">
                    <span>💰 {d.package_offered ? `₹${d.package_offered} LPA` : 'TBD'}</span>
                    <span className="truncate max-w-[120px]">📍 {d.locations[0] || 'TBD'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
