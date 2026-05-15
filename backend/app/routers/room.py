from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import math

from app.models.room import RoomModel
from app.models.student import StudentModel

router = APIRouter(prefix="/drives", tags=["Rooms Logistics"])

class CreateRoomRequest(BaseModel):
    name: str
    capacity: int
    block: Optional[str] = None
    floor: Optional[str] = None

@router.post("/{drive_id}/rooms", status_code=status.HTTP_201_CREATED)
async def create_room(drive_id: str, payload: CreateRoomRequest):
    """Create a physical room for a drive"""
    room = RoomModel(
        drive_id=drive_id,
        name=payload.name,
        capacity=payload.capacity,
        block=payload.block,
        floor=payload.floor,
        current_occupancy=0,
        is_locked=False
    )
    await room.insert()
    return {**room.model_dump(), "id": str(room.id)}

@router.get("/{drive_id}/rooms")
async def list_rooms(drive_id: str):
    """List all rooms and their real-time occupancies for a drive"""
    rooms = await RoomModel.find(RoomModel.drive_id == drive_id).to_list()
    # Serialize ObjectId
    return [{**r.model_dump(), "id": str(r.id)} for r in rooms]

@router.delete("/{drive_id}/rooms/{room_id}")
async def delete_room(drive_id: str, room_id: str):
    """Delete a room"""
    room = await RoomModel.get(room_id)
    if not room or room.drive_id != drive_id:
        raise HTTPException(status_code=404, detail="Room not found")
    await room.delete()
    return {"message": "Room deleted successfully"}

@router.post("/{drive_id}/allocate-rooms")
async def allocate_rooms(drive_id: str):
    """
    God-View Logistics Engine core.
    Finds unassigned checked-in students and distributes them across available rooms.
    """
    # 1. Get all available rooms for this drive
    rooms = await RoomModel.find(RoomModel.drive_id == drive_id).to_list()
    if not rooms:
        raise HTTPException(status_code=400, detail="No rooms configured for this drive.")

    # 2. Get unassigned present students
    # Wait, if we don't have students yet, we can mock the assignment if needed, 
    # but let's write the real DB logic.
    unassigned_students = await StudentModel.find(
        StudentModel.drive_id == drive_id,
        StudentModel.status == "present",
        StudentModel.current_room_id == None
    ).to_list()

    allocated_count = 0

    # 3. Distribute students
    for student in unassigned_students:
        # Find first room with available capacity
        available_room = None
        for room in rooms:
            if room.current_occupancy < room.capacity and not room.is_locked:
                available_room = room
                break
        
        if not available_room:
            # No more capacity
            break
            
        # Allocate
        student.current_room_id = str(available_room.id)
        await student.save()
        
        available_room.current_occupancy += 1
        allocated_count += 1

    # 4. Save updated room capacities
    for room in rooms:
        await room.save()

    return {
        "message": "Allocation complete",
        "allocated_count": allocated_count,
        "unassigned_remaining": len(unassigned_students) - allocated_count
    }

@router.get("/{drive_id}/stats/god-view")
async def god_view_stats(drive_id: str):
    """Fetch total shortlisted, checked-in, and pending for the top row of God View"""
    total_shortlisted = await StudentModel.find(
        StudentModel.drive_id == drive_id,
        # We assume they are either registered or shortlisted.
        # If they check in, status becomes 'present'
    ).count()

    checked_in = await StudentModel.find(
        StudentModel.drive_id == drive_id,
        StudentModel.status == "present"
    ).count()

    # The actual numbers for the dashboard
    return {
        "total_shortlisted": total_shortlisted,
        "checked_in": checked_in,
        "pending_arrival": total_shortlisted - checked_in
    }
