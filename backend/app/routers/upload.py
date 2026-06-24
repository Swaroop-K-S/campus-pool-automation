from fastapi import APIRouter, UploadFile, File, HTTPException, status, Request
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
async def upload_file(request: Request, file: UploadFile = File(...)):
    """Uploads a file. Images go to Cloudinary, PDFs are stored locally to bypass strict delivery."""
    
    # Check if it's a PDF
    is_pdf = file.filename.lower().endswith(".pdf")
    
    try:
        if is_pdf:
            # Save PDF locally to avoid Cloudinary's 401 Strict Delivery block
            upload_dir = os.path.join(os.getcwd(), "uploads")
            os.makedirs(upload_dir, exist_ok=True)
            
            safe_filename = f"upload_{uuid.uuid4().hex}.pdf"
            file_path = os.path.join(upload_dir, safe_filename)
            
            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)
                
            # Construct the full local URL dynamically based on the request's host
            base_url = str(request.base_url).rstrip('/')
            return {"url": f"{base_url}/uploads/{safe_filename}"}
            
        else:
            # It's an image, upload to Cloudinary
            if not settings.CLOUDINARY_CLOUD_NAME:
                raise HTTPException(status_code=500, detail="Cloudinary is not configured.")
                
            contents = await file.read()
            result = cloudinary.uploader.upload(
                contents, 
                resource_type="auto", 
                folder="campuspool_uploads",
                public_id=f"upload_{uuid.uuid4().hex}"
            )
            return {"url": result.get("secure_url")}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
