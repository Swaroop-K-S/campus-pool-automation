from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List
from app.models.student import StudentModel
from app.models.drive import DriveModel
from app.services.notification_service import NotificationService
import asyncio

router = APIRouter(prefix="/drives/{drive_id}/communications", tags=["Communications"])

class CustomBlastRequest(BaseModel):
    subject: str
    message: str
    target_status: str

@router.post("/send-call-letters")
async def send_call_letters(drive_id: str, background_tasks: BackgroundTasks):
    """
    Manually triggers Call Letters for all shortlisted students in this drive.
    """
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    shortlisted_students = await StudentModel.find({"drive_id": drive_id, "status": "shortlisted"}).to_list()
    
    if not shortlisted_students:
        raise HTTPException(status_code=400, detail="No shortlisted students found.")

    background_tasks.add_task(NotificationService.process_shortlist_notifications, shortlisted_students, drive)
    
    return {
        "status": "success", 
        "message": f"Successfully queued Call Letters for {len(shortlisted_students)} students.",
        "queued_count": len(shortlisted_students)
    }

@router.post("/send-custom-blast")
async def send_custom_blast(drive_id: str, payload: CustomBlastRequest, background_tasks: BackgroundTasks):
    """
    Sends a custom email/WhatsApp to all students matching a certain status.
    """
    drive = await DriveModel.get(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # target_status can be 'all', 'shortlisted', 'registered', 'present', etc.
    query = {"drive_id": drive_id}
    if payload.target_status != "all":
        query["status"] = payload.target_status

    target_students = await StudentModel.find(query).to_list()
    
    if not target_students:
        raise HTTPException(status_code=400, detail=f"No students found matching status '{payload.target_status}'.")

    # In a real app, you would add a custom method to NotificationService
    # But for now, we can just reuse the mock logs
    async def process_custom_blast():
        for student in target_students:
            NotificationService._send_mock_email(student.email, payload.subject, payload.message)
            NotificationService._send_mock_whatsapp(student.phone, f"CampusPool Alert: {payload.subject}")
            await asyncio.sleep(0.1)

    background_tasks.add_task(process_custom_blast)
    
    return {
        "status": "success", 
        "message": f"Successfully queued custom blast for {len(target_students)} students.",
        "queued_count": len(target_students)
    }
