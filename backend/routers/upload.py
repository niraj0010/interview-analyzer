from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import uuid

router = APIRouter(prefix="/upload", tags=["Upload"])

# Create uploads folder if not exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = [
    "audio/mpeg", "audio/wav", "audio/webm", "audio/mp4",
    "video/mp4", "video/webm", "audio/x-m4a"
]

@router.post("/")
async def upload_media(file: UploadFile = File(...)):
    """Save audio/video file locally under /uploads directory"""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Please upload audio or video only.")

    # unique filename to avoid conflicts
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    return {
        "filename": unique_name,
        "path": file_path,
        "message": "File saved locally in /uploads folder."
    }
