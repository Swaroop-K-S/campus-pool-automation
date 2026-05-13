from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.models.student import StudentModel
from app.models.drive import DriveModel
from datetime import datetime

router = APIRouter(prefix="/checkin", tags=["Check-in"])

class CheckinRequest(BaseModel):
    unique_id: str
    qr_secret: str # The secret encoded in the QR code

@router.post("/{drive_id}")
async def process_checkin(drive_id: str, payload: CheckinRequest):
    """
    Handle student QR check-in on event day.
    Validates the QR secret (dynamic or static) and the student's unique ID.
    """
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
        
    if drive.status != "event_day":
        raise HTTPException(status_code=403, detail="Check-in is currently closed for this drive.")

    # 1. Validate QR Secret
    if drive.qr_type == "dynamic":
        if payload.qr_secret != drive.current_qr_secret:
            raise HTTPException(status_code=400, detail="Invalid or expired QR code. Please scan the current one.")
    else:
        # Static QR validation logic (e.g., verifying a fixed signature)
        pass # simplified for now

    # 2. Validate Student Unique ID
    student = await StudentModel.find_one({"drive_id": drive_id, "unique_id": payload.unique_id})
    if not student:
        raise HTTPException(status_code=404, detail="Invalid Student ID. You are not registered for this drive.")
        
    # Prevent double check-in
    if student.status == "present":
        return {"success": True, "message": "You are already checked in!", "student": student}

    # 3. Mark Present
    student.status = "present"
    student.check_in_time = datetime.utcnow()
    await student.save()
    
    # TODO: Trigger logistics engine here to auto-assign room based on current capacities
    
    return {"success": True, "message": "Check-in successful!", "student": student}
