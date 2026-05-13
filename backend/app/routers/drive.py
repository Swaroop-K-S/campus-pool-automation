from fastapi import APIRouter, HTTPException, status, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel
from app.models.drive import DriveModel, RoundModel
from app.services.xlsx_parser import process_student_shortlist
from app.services.logistics_engine import LogisticsEngine
from datetime import datetime

router = APIRouter(prefix="/drives", tags=["Drives"])


# ---------------------------------------------------------------------------
# Drive CRUD
# ---------------------------------------------------------------------------

class CreateDriveRequest(BaseModel):
    company_name: str
    package_offered: Optional[str] = None
    locations: Optional[List[str]] = []
    drive_date: Optional[datetime] = None
    reporting_time: Optional[str] = None
    venue_maps_link: Optional[str] = ""
    what_to_bring: Optional[List[str]] = []
    form_start_date: Optional[datetime] = None
    form_end_date: Optional[datetime] = None
    qr_type: str = "static"


class UpdateDriveRequest(BaseModel):
    company_name: Optional[str] = None
    package_offered: Optional[str] = None
    locations: Optional[List[str]] = None
    drive_date: Optional[datetime] = None
    reporting_time: Optional[str] = None
    venue_maps_link: Optional[str] = None
    what_to_bring: Optional[List[str]] = None
    form_start_date: Optional[datetime] = None
    form_end_date: Optional[datetime] = None
    qr_type: Optional[str] = None
    status: Optional[str] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_drive(payload: CreateDriveRequest):
    """Create a new Drive (Step 1 of Wizard)"""
    drive = DriveModel(
        company_name=payload.company_name,
        package_offered=payload.package_offered,
        locations=payload.locations or [],
        drive_date=payload.drive_date,
        reporting_time=payload.reporting_time,
        venue_maps_link=payload.venue_maps_link or "",
        what_to_bring=payload.what_to_bring or [],
        form_start_date=payload.form_start_date,
        form_end_date=payload.form_end_date,
        qr_type=payload.qr_type,
    )
    await drive.insert()
    # Return the drive with its MongoDB _id serialised as a string
    return {**drive.model_dump(), "id": str(drive.id)}


@router.get("/")
async def list_drives():
    """Get all drives for Admin Dashboard — newest first"""
    drives = await DriveModel.find_all().to_list()
    return [
        {**d.model_dump(), "id": str(d.id)}
        for d in sorted(drives, key=lambda x: x.created_at, reverse=True)
    ]


@router.get("/{drive_id}")
async def get_drive(drive_id: str):
    """Get a specific drive by its MongoDB ObjectId"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    return {**drive.model_dump(), "id": str(drive.id)}


@router.patch("/{drive_id}")
async def update_drive(drive_id: str, payload: UpdateDriveRequest):
    """Partially update a drive (used after creation to fill in optional fields)"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    update_data = payload.model_dump(exclude_none=True)
    await drive.set(update_data)
    return {**drive.model_dump(), "id": str(drive.id)}


@router.delete("/{drive_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_drive(drive_id: str):
    """Delete a drive"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    await drive.delete()


# ---------------------------------------------------------------------------
# Rounds
# ---------------------------------------------------------------------------

@router.post("/{drive_id}/rounds", response_model=RoundModel)
async def add_round(drive_id: str, round_data: RoundModel):
    """Add a round to a drive's sequence"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    round_data.drive_id = drive_id
    await round_data.insert()
    return round_data


@router.get("/{drive_id}/rounds", response_model=List[RoundModel])
async def get_rounds(drive_id: str):
    """Get all rounds for a drive, ordered by sequence"""
    rounds = await RoundModel.find({"drive_id": drive_id}).sort("sequence").to_list()
    return rounds


# ---------------------------------------------------------------------------
# Shortlist Upload
# ---------------------------------------------------------------------------

@router.post("/{drive_id}/shortlist/upload")
async def upload_shortlist(drive_id: str, file: UploadFile = File(...)):
    """Upload XLSX file for shortlisting students"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    filename = file.filename or ""
    if not filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an Excel file.")

    contents = await file.read()
    result = await process_student_shortlist(contents, drive_id)
    return result


# ---------------------------------------------------------------------------
# Room Allocation
# ---------------------------------------------------------------------------

@router.post("/{drive_id}/allocate-rooms")
async def allocate_rooms(drive_id: str):
    """Trigger the logistics engine to allocate rooms for the drive"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    rounds = await RoundModel.find({"drive_id": drive_id}).sort("sequence").to_list()
    if not rounds:
        raise HTTPException(status_code=400, detail="No rounds configured for this drive")

    engine = LogisticsEngine(drive_id)
    await engine.allocate_students_to_round(str(rounds[0].id))
    return {"status": "success", "message": f"Allocated students to {rounds[0].name}"}


# ---------------------------------------------------------------------------
# Drive Lifecycle
# ---------------------------------------------------------------------------

@router.post("/{drive_id}/activate")
async def activate_drive(drive_id: str):
    """Move drive from draft → active (opens student registration)"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    if drive.status != "draft":
        raise HTTPException(status_code=400, detail=f"Drive is already '{drive.status}', cannot activate")
    await drive.set({"status": "active"})
    return {**drive.model_dump(), "id": str(drive.id)}


@router.post("/{drive_id}/start-event-day")
async def start_event_day(drive_id: str):
    """Move drive from active → event_day (enables QR check-in)"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    if drive.status != "active":
        raise HTTPException(status_code=400, detail=f"Drive must be 'active' before starting event day")

    from app.models.student import StudentModel
    shortlisted = await StudentModel.find({"drive_id": drive_id, "status": "shortlisted"}).count()
    if shortlisted == 0:
        raise HTTPException(status_code=400, detail="No shortlisted students. Upload a shortlist first.")

    import secrets
    await drive.set({"status": "event_day", "current_qr_secret": secrets.token_hex(16)})
    return {**drive.model_dump(), "id": str(drive.id)}


@router.post("/{drive_id}/complete")
async def complete_drive(drive_id: str):
    """Mark drive as completed"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    await drive.set({"status": "completed"})
    return {**drive.model_dump(), "id": str(drive.id)}


# ---------------------------------------------------------------------------
# Stats (for Admin Overview)
# ---------------------------------------------------------------------------

@router.get("/stats/summary")
async def get_stats_summary():
    """Return aggregate counts for the Admin Overview dashboard"""
    from app.models.student import StudentModel
    all_drives = await DriveModel.find_all().to_list()
    active = [d for d in all_drives if d.status in ("active", "event_day")]
    total_students = await StudentModel.find_all().count()
    return {
        "total_drives": len(all_drives),
        "active_drives": len(active),
        "total_students": total_students,
        "system_status": "online"
    }

