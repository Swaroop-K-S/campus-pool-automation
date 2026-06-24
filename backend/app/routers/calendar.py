from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.drive import DriveModel
import io
from datetime import datetime

router = APIRouter(prefix="/calendar", tags=["Calendar"])

@router.get("/export")
async def export_calendar():
    """
    Generate and stream an RFC-5545 compliant iCalendar (.ics) file
    containing all placement drives.
    """
    drives = await DriveModel.find_all().to_list()
    
    # Start building ICS content
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//CampusPool//Placement Drive Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]
    
    for d in drives:
        if not d.drive_date:
            continue
            
        # Format dates: drive_date is a datetime object
        dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        # Format drive start as 09:00 AM local time and end as 05:00 PM local time
        dtstart = d.drive_date.strftime("%Y%m%dT090000")
        dtend = d.drive_date.strftime("%Y%m%dT170000")
        
        # Escape helper for summary, description, and location
        def escape_val(val: str) -> str:
            if not val:
                return ""
            return val.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")
            
        summary = escape_val(f"Placement Drive: {d.company_name}")
        
        loc_str = ", ".join(d.locations) if d.locations else "TBD"
        location = escape_val(loc_str)
        
        pkg = f"{d.package_offered} LPA" if d.package_offered else "TBD"
        desc_lines = [
            f"Company: {d.company_name}",
            f"Package Offered: {pkg}",
            f"Status: {d.status.upper()}",
            f"Locations: {loc_str}",
            f"Reporting Time: {d.reporting_time or '09:00 AM'}",
            f"Dashboard Link: http://localhost:5173/admin/drives/{str(d.id)}"
        ]
        description = escape_val("\n".join(desc_lines))
        
        event_lines = [
            "BEGIN:VEVENT",
            f"UID:{str(d.id)}@campuspool.com",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{description}",
            f"LOCATION:{location}",
            "END:VEVENT"
        ]
        ics_lines.extend(event_lines)
        
    ics_lines.append("END:VCALENDAR")
    
    # Join with CRLF as required by RFC-5545
    ics_content = "\r\n".join(ics_lines) + "\r\n"
    
    # Stream the file
    stream = io.BytesIO(ics_content.encode("utf-8"))
    return StreamingResponse(
        stream,
        media_type="text/calendar",
        headers={
            "Content-Disposition": "attachment; filename=placement_drives_schedule.ics",
            "Cache-Control": "no-cache"
        }
    )
