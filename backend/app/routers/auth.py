from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.models.student import StudentModel
from app.core.config import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

router = APIRouter(prefix="/auth", tags=["Auth"])


# ---------------------------------------------------------------------------
# Student Auth
# ---------------------------------------------------------------------------

class StudentLoginRequest(BaseModel):
    unique_id: str
    drive_id: str

@router.post("/student/login")
async def student_login(payload: StudentLoginRequest):
    """
    Authenticate a student using their Unique ID assigned during registration.
    Used to access the Student Hub.
    """
    student = await StudentModel.find_one({"drive_id": payload.drive_id, "unique_id": payload.unique_id})
    if not student:
        raise HTTPException(status_code=401, detail="Invalid Unique ID or Drive ID")
    
    # In a full app, we would generate a JWT token here.
    return {
        "success": True, 
        "student": student,
        "message": "Login successful"
    }


# ---------------------------------------------------------------------------
# Admin Auth (Email/Password — kept as fallback)
# ---------------------------------------------------------------------------

class AdminLoginRequest(BaseModel):
    email: str
    password: str
    
@router.post("/admin/login")
async def admin_login(payload: AdminLoginRequest):
    """
    Mock admin login via email/password.
    """
    if payload.email == "admin@campuspool.com" and payload.password == "admin":
        return {"success": True, "token": "mock_jwt_token_here"}
    raise HTTPException(status_code=401, detail="Invalid admin credentials")


# ---------------------------------------------------------------------------
# Admin Auth — Google OAuth SSO
# ---------------------------------------------------------------------------

class GoogleLoginRequest(BaseModel):
    credential: str  # The Google ID Token (JWT) sent from the frontend

@router.post("/admin/google-login")
async def admin_google_login(payload: GoogleLoginRequest):
    """
    Verify a Google ID Token and authenticate an admin if their email
    is listed in the ADMIN_EMAILS environment variable.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on the server."
        )

    # Verify the Google ID token with Google's public keys
    try:
        id_info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )

    email = id_info.get("email", "").lower()
    name = id_info.get("name", "")
    picture = id_info.get("picture", "")

    # Check if this Google account is an authorized admin
    authorized = [e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
    if email not in authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. '{email}' is not an authorized admin account."
        )

    # In production you would generate your own JWT here.
    # For now we return the verified user info directly.
    return {
        "success": True,
        "user": {
            "email": email,
            "name": name,
            "picture": picture,
        },
        "token": "mock_admin_jwt_for_" + email,
        "message": f"Welcome, {name}!"
    }
