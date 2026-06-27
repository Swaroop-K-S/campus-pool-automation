import asyncio
import os
import sys

# Add the current directory to sys.path so 'app' can be resolved
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings
from app.models.student import StudentModel
from app.models.drive import DriveModel
from app.services.notification_service import NotificationService

class MockStudent:
    def __init__(self):
        self.full_name = "Admin Test"
        self.email = settings.SMTP_USER
        self.phone = "1234567890"
        self.usn = "TEST001"
        self.drive_id = "test"
        self.unique_id = "TEST-123"
        self.status = "shortlisted"

class MockDrive:
    def __init__(self):
        self.company_name = "CampusPool Auto-Tester"
        self.package_offered = "N/A"
        self.reporting_time = "Right Now"
        self.venue_name = "Your Inbox"
        self.venue_maps_link = "N/A"
        self.qr_type = "static"

async def test_email():
    print(f"Testing email using account: {settings.SMTP_USER}")
    
    student = MockStudent()
    drive = MockDrive()
    
    print("Sending email...")
    success = await NotificationService.send_call_letter_email(
        student=student,
        drive=drive,
        custom_subject="CampusPool System - Email Test Successful! 🎉",
        custom_body="If you are seeing this email, the SMTP connection and your App Password are working perfectly."
    )
    
    if success:
        print("\n✅ Email successfully sent to your inbox!")
    else:
        print("\n❌ Failed to send email.")

if __name__ == "__main__":
    asyncio.run(test_email())
