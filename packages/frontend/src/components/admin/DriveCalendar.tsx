import React, { useState } from 'react';
import {
  format, addMonths, subMonths, startOfMonth,
  endOfMonth, startOfWeek, endOfWeek, isSameMonth,
  isSameDay, addDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, AlertTriangle, MapPin } from 'lucide-react';

interface DriveCalendarProps {
  drives: any[];
  onDriveClick: (driveId: string) => void;
}

export const DriveCalendar: React.FC<DriveCalendarProps> = ({ drives, onDriveClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MMMM yyyy";

  // Render header logic
  const renderHeader = () => (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white rounded-t-2xl">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">{format(currentDate, dateFormat)}</h2>
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button onClick={prevMonth} className="p-1 px-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"><ChevronLeft size={16} /></button>
          <button onClick={goToToday} className="px-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors">Today</button>
          <button onClick={nextMonth} className="p-1 px-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="flex gap-4 items-center text-xs font-medium">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Scheduled</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Collision Warning</span>
      </div>
    </div>
  );

  const renderDays = () => {
    const daysArr = [];
    const date = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
        daysArr.push(
            <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-400 py-3" key={i}>
                {date[i]}
            </div>
        );
    }
    return <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">{daysArr}</div>;
  };

  const renderCells = () => {
    const rows = [];
    let d = startDate;
    let formattedDate = "";

    while (d <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = d;
        formattedDate = format(d, "d");

        // Find drives falling on this day
        const dayDrives = drives.filter(dr => dr.eventDate && isSameDay(new Date(dr.eventDate), cloneDay));
        
        // Check structural collisions
        let hasCollision = false;
        if (dayDrives.length > 1) {
            // Find if any drives share the exact same venue
            const venues = dayDrives.map(dr => dr.venueDetails?.hallName?.toLowerCase().trim()).filter(Boolean);
            const uniqueVenues = new Set(venues);
            if (venues.length > uniqueVenues.size) {
                hasCollision = true; // Two drives using the same hall
            } else if (dayDrives.length >= 3) {
                hasCollision = true; // General capacity warning: >3 drives a day
            }
        }

        const isTodayDay = isSameDay(d, new Date());

        rows.push(
          <div
            className={`min-h-[140px] px-2 py-2 border-r border-b border-slate-100 transition-colors ${
              !isSameMonth(d, monthStart)
                ? "bg-slate-50 text-slate-400"
                : isTodayDay ? "bg-indigo-50/30" : "bg-white text-slate-800"
            }`}
             key={d.toISOString()}
          >
             <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-bold flex items-center justify-center w-7 h-7 rounded-full ${isTodayDay ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600'}`}>
                    {formattedDate}
                </span>
                {hasCollision && <AlertTriangle size={14} className="text-red-500 mt-1 mr-1" />}
             </div>
             
             <div className="flex flex-col gap-1.5 focus-within:z-10 relative">
                {dayDrives.map((drive, idx) => {
                    const isDraft = drive.status === 'draft';
                    const isCompleted = drive.status === 'completed';
                    
                    const borderCol = hasCollision ? 'border-red-200 bg-red-50 text-red-800' : 
                                      isDraft ? 'border-slate-200 bg-white text-slate-600' : 
                                      isCompleted ? 'border-slate-200 bg-slate-50 text-slate-500' :
                                      'border-indigo-200 bg-indigo-50 text-indigo-800';

                    return (
                        <div 
                          key={drive._id || idx} 
                          onClick={() => onDriveClick(drive._id)}
                          className={`text-xs p-1.5 rounded-md border ${borderCol} cursor-pointer hover:shadow-md transition-all group`}
                        >
                            <div className="font-bold truncate" title={drive.companyName}>{drive.companyName}</div>
                            <div className="text-[10px] truncate opacity-80" title={drive.jobRole}>{drive.jobRole}</div>
                            {drive.venueDetails?.hallName && (
                                <div className="text-[9px] mt-1 flex items-center gap-0.5 opacity-70 truncate font-semibold">
                                    <MapPin size={9} /> {drive.venueDetails.hallName}
                                </div>
                            )}
                        </div>
                    );
                })}
             </div>
          </div>
        );
        d = addDays(d, 1);
      }
    }

    return (
      <div className="grid grid-cols-7 grid-rows-auto bg-white rounded-b-2xl overflow-hidden shadow-sm border border-t-0 border-slate-200">
        {rows}
      </div>
    );
  };

  return (
    <div className="mb-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};
