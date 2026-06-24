from fastapi import APIRouter, Depends, HTTPException, Body
from app.models.settings import SystemSettings
from pydantic import BaseModel
import httpx
from app.core.config import settings as app_settings

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    admin_name: str | None = None
    admin_email: str | None = None
    system_mail_id: str | None = None
    whatsapp_number: str | None = None
    google_calendar_sync_enabled: bool | None = None

class GoogleAuthCode(BaseModel):
    code: str

@router.get("/", response_model=SystemSettings)
async def get_settings():
    settings = await SystemSettings.find_one()
    if not settings:
        settings = SystemSettings()
        await settings.insert()
    return settings

@router.put("/", response_model=SystemSettings)
async def update_settings(update_data: SettingsUpdate):
    settings = await SystemSettings.find_one()
    if not settings:
        settings = SystemSettings()
        await settings.insert()
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(settings, key, value)
    
    await settings.save()
    return settings

@router.post("/google-auth")
async def google_auth_exchange(payload: GoogleAuthCode):
    settings = await SystemSettings.find_one()
    if not settings:
        settings = SystemSettings()
        await settings.insert()

    # If we have client secret, exchange for refresh token
    client_secret = getattr(app_settings, "GOOGLE_CLIENT_SECRET", None)
    if not client_secret:
        # For demonstration if secret is missing, just mark it as connected
        settings.google_account_connected = True
        settings.google_account_email = "connected_via_oauth@google.com"
        await settings.save()
        return {"status": "success", "message": "Google account marked as connected (Missing Client Secret for full exchange)"}

    async with httpx.AsyncClient() as client:
        response = await client.post("https://oauth2.googleapis.com/token", data={
            "code": payload.code,
            "client_id": app_settings.GOOGLE_CLIENT_ID,
            "client_secret": client_secret,
            "redirect_uri": "postmessage",
            "grant_type": "authorization_code"
        })
        
        data = response.json()
        if "error" in data:
            raise HTTPException(status_code=400, detail=data.get("error_description", "Failed to exchange auth code"))
            
        access_token = data.get("access_token")
        refresh_token = data.get("refresh_token")
        
        # Get user email
        user_info_resp = await client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={
            "Authorization": f"Bearer {access_token}"
        })
        user_info = user_info_resp.json()
        
        settings.google_account_connected = True
        settings.google_account_email = user_info.get("email", "unknown@google.com")
        if refresh_token:
            settings.google_refresh_token = refresh_token
            
        await settings.save()
        
    return {"status": "success", "email": settings.google_account_email}

@router.post("/google-auth/disconnect")
async def google_auth_disconnect():
    settings = await SystemSettings.find_one()
    if settings:
        settings.google_account_connected = False
        settings.google_account_email = None
        settings.google_refresh_token = None
        settings.google_calendar_sync_enabled = False
        await settings.save()
    return {"status": "success"}
