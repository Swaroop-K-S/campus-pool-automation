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

DEFAULT_CALL_LETTER_SUBJECT = "Call Letter: Placement Drive at {{company_name}}"

DEFAULT_CALL_LETTER_BODY = """Dear {{full_name}},

Congratulations! You have been shortlisted for the upcoming placement drive.

Drive Details:
🏢 Company: {{company_name}}
💰 Package: {{package_offered}}
📅 Reporting Time: {{reporting_time}}
📍 Venue: {{venue_name}}
🗺️ Maps Link: {{venue_maps_link}}

Your Registration ID is: {{unique_id}}
Please present this ID or your QR code at the campus front desk upon arrival.

Best of luck,
Campus Placement Cell"""

DEFAULT_WHATSAPP_MESSAGE = "CampusPool Alert!\nHi {{full_name}}, you've been shortlisted for {{company_name}}! Please check your email ({{email}}) for your official Call Letter and reporting time. Good luck!"

class NotificationService:
    @staticmethod
    def _send_mock_email(to_email: str, subject: str, body: str):
        print(f"\n{'='*50}")
        print(f"MOCK EMAIL SENT")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        print(f"{'='*50}\n")

    @staticmethod
    def _send_mock_whatsapp(phone: str, message: str):
        print(f"\n{'='*50}")
        print(f"MOCK WHATSAPP SENT")
        print(f"To: {phone}")
        print(f"Message: {message}")
        print(f"{'='*50}\n")

    @classmethod
    def format_template(cls, template: str, student: StudentModel, drive: DriveModel) -> str:
        return template.replace("{{full_name}}", student.full_name) \
                       .replace("{{company_name}}", drive.company_name) \
                       .replace("{{package_offered}}", str(drive.package_offered or 'TBD')) \
                       .replace("{{reporting_time}}", str(drive.reporting_time or '09:00 AM')) \
                       .replace("{{venue_name}}", str(drive.venue_name or 'TBA')) \
                       .replace("{{venue_maps_link}}", str(drive.venue_maps_link or 'TBA')) \
                       .replace("{{unique_id}}", student.unique_id) \
                       .replace("{{email}}", student.email)

    @classmethod
    async def send_call_letter_email(cls, student: StudentModel, drive: DriveModel, custom_subject: str = None, custom_body: str = None):
        subject_template = custom_subject if custom_subject else DEFAULT_CALL_LETTER_SUBJECT
        subject = cls.format_template(subject_template, student, drive)
        
        body_content_template = custom_body if custom_body else DEFAULT_CALL_LETTER_BODY
        body_content = cls.format_template(body_content_template, student, drive)
        
        # Convert plain text to HTML with <br> tags
        html_body_content = body_content.replace("\n", "<br>")
        
        # HTML formatting for a beautiful email
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">CampusPool Hall Ticket</h1>
                    </div>
                    <div style="padding: 30px;">
                        {html_body_content}
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
    async def send_whatsapp_alert(cls, student: StudentModel, drive: DriveModel, custom_message: str = None):
        msg_template = custom_message if custom_message else DEFAULT_WHATSAPP_MESSAGE
        message = cls.format_template(msg_template, student, drive)

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
    async def send_web_push(cls, student: StudentModel, message: str):
        """Send a Web Push Notification using pywebpush"""
        if not student.push_subscription:
            return False
            
        if not settings.VAPID_PRIVATE_KEY:
            logger.warning("VAPID keys not configured, skipping web push")
            return False
            
        try:
            # We import pywebpush here to avoid crashing if it's not installed
            from pywebpush import webpush, WebPushException
            import json
            
            payload = json.dumps({
                "title": "CampusPool Alert",
                "body": message,
                "icon": "/icons/pwa-192x192.png",
                "badge": "/icons/pwa-192x192.png"
            })
            
            def _push():
                webpush(
                    subscription_info=student.push_subscription,
                    data=payload,
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": settings.VAPID_SUBJECT}
                )
                
            await asyncio.to_thread(_push)
            return True
        except Exception as e:
            logger.error(f"Failed to send web push to {student.email}: {str(e)}")
            return False

    @classmethod
    async def process_shortlist_notifications(cls, students: list[StudentModel], drive: DriveModel, custom_subject: str = None, custom_email: str = None, custom_whatsapp: str = None):
        """
        Takes a batch of students and sends them both an Email and a WhatsApp message.
        This function should be called via FastAPI BackgroundTasks.
        """
        for student in students:
            # We use asyncio.gather to send both concurrently for each student
            
            # Format push notification message
            push_message = custom_whatsapp if custom_whatsapp else cls.format_template(DEFAULT_WHATSAPP_MESSAGE, student, drive)
            # Remove any html or complex formatting for push
            
            await asyncio.gather(
                cls.send_call_letter_email(student, drive, custom_subject, custom_email),
                cls.send_whatsapp_alert(student, drive, custom_whatsapp),
                cls.send_web_push(student, push_message)
            )
            # Add a small delay to avoid rate limiting
            await asyncio.sleep(0.1)
