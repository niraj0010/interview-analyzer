import torch
import whisper

# Load Whisper model once when the app starts
device = "cuda" if torch.cuda.is_available() else "cpu"
model = whisper.load_model("base", device=device)

def transcribe_audio(audio_path: str) -> str:
    """
    Transcribe an audio file into text using Whisper.
    """
    try:
        result = model.transcribe(audio_path)
        return result.get("text", "").strip()
    except Exception as e:
        return f"Transcription failed: {str(e)}"
