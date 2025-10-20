from fastapi import APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
import os
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe an uploaded audio or video file using OpenAI Whisper API.
    """
    try:
        # Save temporarily
        temp_path = f"uploads/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        # Send to OpenAI Whisper
        with open(temp_path, "rb") as audio:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio
            )

        os.remove(temp_path)
        return {"transcript": transcript.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
