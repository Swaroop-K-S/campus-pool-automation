from beanie import Document
from typing import Optional

class RoomModel(Document):
    drive_id: str
    round_id: Optional[str] = None # The round this room is allocated to
    name: str # e.g., "Seminar Hall" or "Room 102"
    capacity: int # Number of seats
    block: Optional[str] = None # e.g., "C Block"
    floor: Optional[str] = None # e.g., "1st Floor"
    
    # For the logistics engine to track real-time occupancy
    current_occupancy: int = 0
    is_locked: bool = False

    class Settings:
        name = "rooms"
