from beanie import Document
from pydantic import Field
from typing import Optional, List
from datetime import datetime

class RoundModel(Document):
    drive_id: str
    name: str
    sequence: int # 1 for Seminar, 2 for Aptitude, etc.
    round_type: str # 'seminar', 'aptitude', 'gd', 'technical', 'hr'
    status: str = "pending" # pending, active, completed

    class Settings:
        name = "rounds"

class DriveModel(Document):
    company_name: str
    package_offered: str
    locations: List[str]
    drive_date: datetime
    reporting_time: str
    venue_maps_link: str
    what_to_bring: List[str]
    
    # Form configurations
    form_start_date: Optional[datetime] = None
    form_end_date: Optional[datetime] = None
    
    # Event day settings
    qr_type: str = "static" # 'static' or 'dynamic' (rotates every 30s)
    current_qr_secret: Optional[str] = None # Used for dynamic QR validation
    
    status: str = "draft" # draft, active, event_day, completed
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "drives"
