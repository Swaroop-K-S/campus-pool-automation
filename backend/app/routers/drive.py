from fastapi import APIRouter, HTTPException, status, UploadFile, File
from typing import List
from app.models.drive import DriveModel, RoundModel
from app.services.xlsx_parser import process_student_shortlist
from app.services.logistics_engine import LogisticsEngine

router = APIRouter(prefix="/drives", tags=["Drives"])

@router.post("/", response_model=DriveModel, status_code=status.HTTP_201_CREATED)
async def create_drive(drive: DriveModel):
    """Create a new Drive (Step 1 of Wizard)"""
    await drive.insert()
    return drive

@router.get("/", response_model=List[DriveModel])
async def list_drives():
    """Get all drives for Admin Dashboard"""
    drives = await DriveModel.find_all().to_list()
    return drives

@router.get("/{drive_id}", response_model=DriveModel)
async def get_drive(drive_id: str):
    """Get specific drive details"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    return drive

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

@router.post("/{drive_id}/shortlist/upload")
async def upload_shortlist(drive_id: str, file: UploadFile = File(...)):
    """Upload XLSX file for shortlisting students"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
        
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an Excel file.")
        
    contents = await file.read()
    result = await process_student_shortlist(contents, drive_id)
    
    # Optional: Update Drive status or metadata
    
    return result

@router.post("/{drive_id}/allocate-rooms")
async def allocate_rooms(drive_id: str):
    """Trigger the logistics engine to allocate rooms for the drive"""
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
        
    # Get the first round to allocate
    rounds = await RoundModel.find({"drive_id": drive_id}).sort("sequence").to_list()
    if not rounds:
        raise HTTPException(status_code=400, detail="No rounds configured for this drive")
        
    engine = LogisticsEngine(drive_id)
    # We allocate for the first round by default for now
    await engine.allocate_students_to_round(str(rounds[0].id))
    
    return {"status": "success", "message": f"Allocated students to {rounds[0].name}"}
