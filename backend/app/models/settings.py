from beanie import Document
from typing import Optional

class SystemSettings(Document):
    admin_name: str = "Admin"
    admin_email: str = "admin@example.com"
    system_mail_id: str = "noreply@campuspool.com"
    whatsapp_number: str = "+1234567890"
    google_account_connected: bool = False
    google_account_email: Optional[str] = None
    google_calendar_sync_enabled: bool = False
    google_refresh_token: Optional[str] = None

    class Settings:
        name = "system_settings"
