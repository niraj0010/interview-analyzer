from fastapi import APIRouter, UploadFile, File, HTTPException
import requests, os, ffmpeg
from transformers import pipeline
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

# Setup Whisper and Emotion configs
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"
EMOTION_MODEL = pipeline("audio-classification", model="r-f/wav2vec-english-speech-emotion-recognition")


@router.post("/analyze")
async def analyze_interview(file: UploadFile = File(...)):
    """
    Upload → Transcribe → Emotion Detection (Single endpoint)
    """
    try:
        os.makedirs("uploads", exist_ok=True)
        temp_path = f"uploads/{file.filename}"
        wav_path = temp_path.rsplit(".", 1)[0] + ".wav"

        # Save uploaded file locally
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        # Convert to wav if not already
        ffmpeg.input(temp_path).output(wav_path, format="wav", ac=1, ar="16000").run(quiet=True, overwrite_output=True)

        # === STEP 1: Transcription ===
        with open(wav_path, "rb") as audio_file:
            headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
            data = {"model": "whisper-1"}
            whisper_response = requests.post(WHISPER_URL, headers=headers, data=data, files={"file": audio_file})

        if whisper_response.status_code != 200:
            raise HTTPException(status_code=whisper_response.status_code, detail=whisper_response.text)
        transcript = whisper_response.json().get("text", "Transcription failed")

        # === STEP 2: Emotion Detection ===
        emotions = EMOTION_MODEL(wav_path)
        dominant_emotion = emotions[0]["label"]
        confidence = round(emotions[0]["score"], 3)

        # Cleanup
        os.remove(temp_path)
        os.remove(wav_path)

        return {
            "transcript": transcript,
            "dominant_emotion": dominant_emotion,
            "confidence": confidence,
            "all_emotions": emotions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
