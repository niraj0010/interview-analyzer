from fastapi import APIRouter

router = APIRouter(prefix="/transcribe", tags=["Transcription"])

@router.get("/")
def transcribe_placeholder():
    return {"message": "Transcription route working!"}
