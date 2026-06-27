from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings
from app.models.student import StudentModel

router = APIRouter(prefix="/push", tags=["Push Notifications"])

class PushSubscription(BaseModel):
    endpoint: str
    expirationTime: float | None = None
    keys: dict

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Return the public VAPID key to the frontend"""
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="VAPID keys not configured on server")
    return {"public_key": settings.VAPID_PUBLIC_KEY}

@router.post("/subscribe/{unique_id}")
async def subscribe_to_push(unique_id: str, subscription: PushSubscription):
    """Save the push subscription for a student"""
    student = await StudentModel.find_one(StudentModel.unique_id == unique_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    student.push_subscription = subscription.model_dump()
    await student.save()
    
    return {"message": "Push subscription saved successfully"}
