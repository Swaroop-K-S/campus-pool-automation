from beanie import Document
from pydantic import EmailStr, Field
from typing import Optional
from datetime import datetime

class StudentModel(Document):
    drive_id: str
    unique_id: str # Generated after registration
    
    # Registration details
    full_name: str
    email: EmailStr
    phone: str
    
    # State machine properties
    status: str = "registered" # registered, shortlisted, present, passed, rejected, selected
    
    # Event day tracking
    check_in_time: Optional[datetime] = None
    current_room_id: Optional[str] = None # Physical routing assignment
    
    # Dynamic Form Data
    custom_data: dict = Field(default_factory=dict) # Stores form responses like branch, cgpa, and file URLs
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "students"
