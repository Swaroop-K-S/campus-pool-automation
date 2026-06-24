import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
import logging

from app.core.config import settings
from app.models.student import StudentModel
from app.models.drive import DriveModel

# Configure logger for mock notifications
logger = logging.getLogger("NotificationService")
logger.setLevel(logging.INFO)

class NotificationService:
    @staticmethod
    def _send_mock_email(to_email: str, subject: str, body: str):
        print(f"\n{'='*50}")
        print(f"📧 MOCK EMAIL SENT")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        print(f"{'='*50}\n")

    @staticmethod
    def _send_mock_whatsapp(phone: str, message: str):
        print(f"\n{'='*50}")
        print(f"💬 MOCK WHATSAPP SENT")
        print(f"To: {phone}")
        print(f"Message: {message}")
        print(f"{'='*50}\n")

    @classmethod
    async def send_call_letter_email(cls, student: StudentModel, drive: DriveModel):
        subject = f"Call Letter: Placement Drive at {drive.company_name}"
        
        # HTML formatting for a beautiful email
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">CampusPool Hall Ticket</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>Dear <strong>{student.full_name}</strong>,</p>
                        <p>Congratulations! You have been shortlisted for the upcoming placement drive.</p>
                        
                        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #4F46E5;">Drive Details</h3>
                            <ul style="list-style-type: none; padding-left: 0; margin: 0;">
                                <li style="margin-bottom: 8px;">🏢 <strong>Company:</strong> {drive.company_name}</li>
                                <li style="margin-bottom: 8px;">💰 <strong>Package:</strong> {drive.package_offered if drive.package_offered else 'TBD'}</li>
                                <li style="margin-bottom: 8px;">📅 <strong>Reporting Time:</strong> {drive.reporting_time if drive.reporting_time else '09:00 AM'}</li>
                            </ul>
                        </div>
                        
                        <p style="margin-top: 30px;">Your Registration ID is: <strong>{student.unique_id}</strong></p>
                        <p>Please present this ID or your QR code at the campus front desk upon arrival.</p>
                        
                        <p style="margin-top: 40px; font-size: 14px; color: #6b7280;">Best of luck,<br>Campus Placement Cell</p>
                    </div>
                </div>
            </body>
        </html>
        """

        # If SMTP is configured, send a real email
        if settings.SMTP_SERVER and settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = settings.SMTP_USER
                msg["To"] = student.email
                msg.attach(MIMEText(body, "html"))

                # Run sync SMTP call in a thread to not block the async event loop
                def _send():
                    with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT or 587) as server:
                        server.starttls()
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                        server.send_message(msg)

                await asyncio.to_thread(_send)
                return True
            except Exception as e:
                logger.error(f"Failed to send real email to {student.email}: {str(e)}")
                # Fallback to mock on error
                cls._send_mock_email(student.email, subject, "Failed to send real email. Mocked instead.\n" + body)
                return False
        else:
            # Fallback to mock
            cls._send_mock_email(student.email, subject, body)
            return True

    @classmethod
    async def send_whatsapp_alert(cls, student: StudentModel, drive: DriveModel):
        message = f"📢 CampusPool Alert!\nHi {student.full_name}, you've been shortlisted for {drive.company_name}! Please check your email ({student.email}) for your official Call Letter and reporting time. Good luck!"

        if settings.WHATSAPP_API_KEY:
            # Example Twilio integration placeholder
            try:
                # Make HTTP call to WhatsApp Business API
                # async with httpx.AsyncClient() as client:
                #     await client.post(...)
                pass 
            except Exception as e:
                logger.error(f"Failed to send real WhatsApp to {student.phone}: {str(e)}")
                cls._send_mock_whatsapp(student.phone, message)
        else:
            cls._send_mock_whatsapp(student.phone, message)
            
        return True

    @classmethod
    async def process_shortlist_notifications(cls, students: list[StudentModel], drive: DriveModel):
        """
        Takes a batch of students and sends them both an Email and a WhatsApp message.
        This function should be called via FastAPI BackgroundTasks.
        """
        for student in students:
            # We use asyncio.gather to send both concurrently for each student
            await asyncio.gather(
                cls.send_call_letter_email(student, drive),
                cls.send_whatsapp_alert(student, drive)
            )
            # Add a small delay to avoid rate limiting
            await asyncio.sleep(0.1)
