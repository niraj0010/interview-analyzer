from fastapi import APIRouter, UploadFile, File, HTTPException
from transformers import pipeline
import os
import ffmpeg

# Initialize FastAPI router
router = APIRouter()

# Load Hugging Face emotion model
try:
    print(" Loading emotion detection model...")
    emotion_model = pipeline(
        "audio-classification",
        model="r-f/wav2vec-english-speech-emotion-recognition"
    )
    print(" Emotion model loaded successfully.")
except Exception as e:
    print(f" Failed to load emotion model: {e}")
    raise e


@router.post("/emotion")
async def analyze_emotion(file: UploadFile = File(...)):
    """
    Analyze emotions in an uploaded audio or video file.
    Automatically converts to WAV and classifies emotion using Hugging Face Wav2Vec2 model.
    """
    try:
        os.makedirs("uploads", exist_ok=True)
        temp_path = f"uploads/{file.filename}"
        wav_path = temp_path.rsplit(".", 1)[0] + ".wav"

        # Save the uploaded file
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        #  Convert to WAV (works for .mp4, .m4a, etc.)
        ffmpeg.input(temp_path).output(
            wav_path, format="wav", ac=1, ar="16000"
        ).run(quiet=True, overwrite_output=True)

        #  Run emotion model
        results = emotion_model(wav_path)
        top_result = results[0]

        #  Clean up
        os.remove(temp_path)
        os.remove(wav_path)

        return {
            "emotion": top_result["label"],
            "confidence": round(top_result["score"], 3),
            "all_predictions": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
