from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import Dict, Any, Optional
import io
from openpyxl import Workbook

from app.models.student import StudentModel
from app.models.drive import DriveModel

router = APIRouter(prefix="/drives", tags=["Students"])

class StudentRegistrationRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    custom_data: Dict[str, Any]

@router.post("/{drive_id}/register", status_code=status.HTTP_201_CREATED)
async def register_student(drive_id: str, payload: StudentRegistrationRequest):
    """
    Public endpoint for a student to register for a drive.
    Validates the drive exists and is active, then saves the student with their custom dynamic data.
    """
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
        
    if drive.status not in ["active", "event_day"]:
        raise HTTPException(status_code=400, detail="Registration is closed for this drive.")

    # Check if student already registered
    existing = await StudentModel.find_one(
        StudentModel.drive_id == drive_id,
        StudentModel.email == payload.email
    )
    if existing:
        raise HTTPException(status_code=400, detail="A student with this email is already registered.")

    # Validate Eligibility Criteria
    if drive.eligibility_criteria:
        criteria = drive.eligibility_criteria
        cgpa_str = payload.custom_data.get("cgpa")
        backlogs_str = payload.custom_data.get("backlogs")
        branch = payload.custom_data.get("branch")
        
        if criteria.min_cgpa is not None:
            if not cgpa_str:
                raise HTTPException(status_code=400, detail="CGPA is required to verify eligibility for this drive.")
            try:
                if float(cgpa_str) < criteria.min_cgpa:
                    raise HTTPException(status_code=400, detail=f"Sorry, you do not meet the minimum CGPA requirement of {criteria.min_cgpa} for this drive.")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid CGPA format.")
                
        if criteria.max_backlogs is not None:
            if backlogs_str is None:
                raise HTTPException(status_code=400, detail="Active Backlogs count is required to verify eligibility.")
            try:
                if int(backlogs_str) > criteria.max_backlogs:
                    raise HTTPException(status_code=400, detail=f"Sorry, this drive allows a maximum of {criteria.max_backlogs} active backlogs.")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid backlogs format.")
                
        if criteria.allowed_branches:
            if not branch:
                raise HTTPException(status_code=400, detail="Branch is required to verify eligibility.")
            # Normalize branch names for comparison
            normalized_allowed = [b.lower().strip() for b in criteria.allowed_branches]
            if branch.lower().strip() not in normalized_allowed:
                raise HTTPException(status_code=400, detail="Sorry, your branch is not eligible for this drive.")

    # Generate a unique ID (e.g. USN or just an increment, here we use a short hash or hex)
    import uuid
    unique_id = uuid.uuid4().hex[:8].upper()

    student = StudentModel(
        drive_id=drive_id,
        unique_id=unique_id,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        status="registered",
        custom_data=payload.custom_data
    )
    
    await student.insert()
    
    return {
        "message": "Registration successful",
        "unique_id": student.unique_id,
        "id": str(student.id)
    }

# ---------------------------------------------------------------------------
# Admin Endpoints (Query/Fetch)
# ---------------------------------------------------------------------------

@router.get("/{drive_id}/students")
async def get_drive_students(drive_id: str):
    """
    Retrieve all registered/shortlisted students for a specific drive.
    """
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
        
    students = await StudentModel.find(StudentModel.drive_id == drive_id).to_list()
    return [
        {**s.model_dump(), "id": str(s.id)}
        for s in students
    ]


@router.get("/{drive_id}/students/export")
async def export_drive_students(
    drive_id: str,
    search: Optional[str] = None,
    status: Optional[str] = None
):
    """
    Export registered students for a specific drive to an Excel (.xlsx) file.
    """
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
        
    students = await StudentModel.find(StudentModel.drive_id == drive_id).to_list()
    
    # Filter
    filtered = []
    for s in students:
        if search:
            s_lower = search.lower()
            match = (
                s_lower in s.full_name.lower() or
                s_lower in s.email.lower() or
                s_lower in s.phone or
                s_lower in s.unique_id.lower()
            )
            if not match:
                continue
        if status and status != "all":
            if s.status != status:
                continue
        filtered.append(s)
        
    # Get all unique custom fields keys
    custom_keys = []
    seen_keys = set()
    for s in filtered:
        if s.custom_data:
            for k in s.custom_data.keys():
                if k not in seen_keys:
                    seen_keys.add(k)
                    custom_keys.append(k)
                    
    # Generate Excel
    wb = Workbook()
    ws = wb.active
    ws.title = "Registrations"
    
    # Headers
    headers = [
        "Unique ID",
        "Full Name",
        "Email",
        "Phone",
        "Status",
        "Registration Date",
    ] + [k.replace("_", " ").title() for k in custom_keys]
    ws.append(headers)
    
    # Data Rows
    for s in filtered:
        reg_date = s.created_at.strftime('%d-%m-%Y %H:%M') if s.created_at else ""
        custom_cells = [s.custom_data.get(k, "") for k in custom_keys]
        row = [
            s.unique_id,
            s.full_name,
            s.email,
            s.phone,
            s.status.upper(),
            reg_date,
        ] + custom_cells
        ws.append(row)
        
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    
    filename = f"registrations_{drive.company_name.replace(' ', '_')}.xlsx"
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


global_router = APIRouter(prefix="/students", tags=["Students"])

@global_router.get("/")
async def get_global_students():
    """
    Retrieve all registered students across all drives, returning them
    joined with the company_name of their drive.
    """
    students = await StudentModel.find_all().to_list()
    drives = await DriveModel.find_all().to_list()
    drive_map = {str(d.id): d.company_name for d in drives}
    
    results = []
    for s in students:
        s_dict = s.model_dump()
        s_dict["id"] = str(s.id)
        s_dict["company_name"] = drive_map.get(s.drive_id, "Unknown Drive")
        results.append(s_dict)
        
    return results


@global_router.get("/export")
async def export_global_students(
    search: Optional[str] = None,
    status: Optional[str] = None,
    drive_id: Optional[str] = None
):
    """
    Export all students globally across all drives to an Excel (.xlsx) file.
    """
    students = await StudentModel.find_all().to_list()
    drives = await DriveModel.find_all().to_list()
    drive_map = {str(d.id): d.company_name for d in drives}
    
    # Filter
    filtered = []
    for s in students:
        if search:
            s_lower = search.lower()
            match = (
                s_lower in s.full_name.lower() or
                s_lower in s.email.lower() or
                s_lower in s.phone or
                s_lower in s.unique_id.lower()
            )
            if not match:
                continue
        if status and status != "all":
            if s.status != status:
                continue
        if drive_id and drive_id != "all":
            if s.drive_id != drive_id:
                continue
        filtered.append(s)
        
    # Get all unique custom fields keys
    custom_keys = []
    seen_keys = set()
    for s in filtered:
        if s.custom_data:
            for k in s.custom_data.keys():
                if k not in seen_keys:
                    seen_keys.add(k)
                    custom_keys.append(k)
                    
    # Generate Excel
    wb = Workbook()
    ws = wb.active
    ws.title = "Global Directory"
    
    # Headers
    headers = [
        "Unique ID",
        "Full Name",
        "Email",
        "Phone",
        "Status",
        "Placement Drive",
        "Registration Date",
    ] + [k.replace("_", " ").title() for k in custom_keys]
    ws.append(headers)
    
    # Data Rows
    for s in filtered:
        reg_date = s.created_at.strftime('%d-%m-%Y %H:%M') if s.created_at else ""
        custom_cells = [s.custom_data.get(k, "") for k in custom_keys]
        row = [
            s.unique_id,
            s.full_name,
            s.email,
            s.phone,
            s.status.upper(),
            drive_map.get(s.drive_id, "Unknown Drive"),
            reg_date,
        ] + custom_cells
        ws.append(row)
        
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=global_students_directory.xlsx"}
    )

from app.models.room import RoomModel

@global_router.get("/{unique_id}/live-status")
async def get_student_live_status(unique_id: str):
    """
    Fetch the live status and room allocation for a specific student.
    Used by the Student Hub PWA to provide a live "Food Delivery" style tracker.
    """
    student = await StudentModel.find_one(StudentModel.unique_id == unique_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    response = {
        "status": student.status,
        "current_room_id": student.current_room_id,
        "room_name": None,
        "queue_position": None,
        "push_enabled": bool(student.push_subscription)
    }
    
    # If allocated to a room, fetch the room name
    if student.current_room_id:
        room = await RoomModel.get(student.current_room_id)
        if room:
            response["room_name"] = room.name
            
    # If they are in a waiting status (e.g., 'present' but no room assigned)
    # the frontend can display a generic "In Queue" message since
    # random allocation is used instead of FIFO queue.
            
    return response
