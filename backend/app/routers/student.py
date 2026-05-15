from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Dict, Any

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
