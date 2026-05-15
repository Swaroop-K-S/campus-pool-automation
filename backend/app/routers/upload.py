from fastapi import APIRouter, UploadFile, File, HTTPException, status
import cloudinary
import cloudinary.uploader
import os
import uuid

from app.core.config import settings

router = APIRouter(prefix="/upload", tags=["Uploads"])

# Configure Cloudinary
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    """Uploads a file to Cloudinary and returns the secure URL"""
    if not settings.CLOUDINARY_CLOUD_NAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary is not configured. Please set the API keys in .env."
        )

    try:
        # Check if it's a PDF or Image
        is_pdf = file.filename.lower().endswith(".pdf")
        resource_type = "image"
        if is_pdf:
            resource_type = "raw" # Cloudinary handles PDFs as raw or image (for thumbnails), but 'auto' is safest.
            
        # Cloudinary needs raw file bytes
        contents = await file.read()
        
        # Upload
        result = cloudinary.uploader.upload(
            contents, 
            resource_type="auto", 
            folder="campuspool_uploads",
            public_id=f"upload_{uuid.uuid4().hex}"
        )
        
        return {"url": result.get("secure_url")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
