# routers/analyze.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
import os, json, tempfile, requests, ffmpeg, time, re
from dotenv import load_dotenv
from transformers import pipeline
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()
router = APIRouter()

# ========= CONFIG =========
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
FIREBASE_CREDENTIALS = "firebase-service-account.json"

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY missing in environment")

WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"

# Emotion model (loaded once)
EMOTION_MODEL = pipeline(
    "audio-classification",
    model="r-f/wav2vec-english-speech-emotion-recognition"
)

# Firestore (optional)
db = None
if FIREBASE_CREDENTIALS and os.path.exists(FIREBASE_CREDENTIALS):
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_CREDENTIALS)
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firestore initialized successfully.")
else:
    print("ℹ️  Firestore disabled (FIREBASE_CREDENTIALS file missing or path incorrect).")


# ========= HELPERS =========
def to_wav(src_path: str, dst_path: str):
    """Convert any audio file to mono 16kHz WAV (for Whisper + wav2vec)."""
    (
        ffmpeg
        .input(src_path)
        .output(dst_path, format="wav", ac=1, ar="16000")
        .overwrite_output()
        .run(quiet=True)
    )

def probe_duration(path: str) -> str:
    """Return duration as mm:ss string."""
    try:
        info = ffmpeg.probe(path)
        sec = float(info["format"]["duration"])
        m, s = divmod(int(round(sec)), 60)
        return f"{m:02d}:{s:02d}"
    except Exception:
        return ""

def whisper_transcribe(wav_path: str) -> str:
    """Send WAV to Whisper API for transcription."""
    with open(wav_path, "rb") as audio_file:
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        data = {"model": "whisper-1"}
        r = requests.post(WHISPER_URL, headers=headers, data=data, files={"file": audio_file})
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json().get("text", "")

def detect_emotion(wav_path: str):
    """Detect dominant emotion using wav2vec model."""
    res = EMOTION_MODEL(wav_path)
    res = sorted(res, key=lambda x: x["score"], reverse=True)
    top = res[0]
    return top["label"], float(top["score"]), res


# ========= GEMINI REST CALL (FIXED) =========
def gemini_generate(prompt: str, model: str = None) -> str:
    """Use REST API for Gemini (AI Studio key format)."""
    if not GOOGLE_API_KEY:
        print("⚠️  GOOGLE_API_KEY missing — Gemini skipped.")
        return None

    # Try different model names in order of preference (Updated for Gemini 2.0/2.5)
    models_to_try = [
        "gemini-2.5-flash",        # Newest and best
        "gemini-2.0-flash",        # Stable alternative
        "gemini-flash-latest",     # Always uses latest
        "gemini-2.5-flash-lite",   # Faster, lighter version
        "gemini-pro-latest"        # Pro model fallback
    ]
    
    if model:
        # If a specific model is requested, try it first
        models_to_try = [model] + [m for m in models_to_try if m != model]

    last_error = None
    
    for model_name in models_to_try:
        # AI Studio uses ?key= instead of Bearer token
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GOOGLE_API_KEY}"

        headers = {"Content-Type": "application/json"}
        payload = {"contents": [{"parts": [{"text": prompt}]}]}

        try:
            print(f"📡 Trying Gemini model: {model_name}")
            resp = requests.post(url, headers=headers, json=payload, timeout=60)
            
            if resp.status_code == 200:
                data = resp.json()
                print(f"✅ Success with model: {model_name}")
                return data["candidates"][0]["content"]["parts"][0]["text"]
            elif resp.status_code == 404:
                print(f"⚠️  Model {model_name} not found, trying next...")
                last_error = f"Model {model_name} not found"
                continue
            else:
                print(f"❌ Gemini REST Error {resp.status_code}: {resp.text}")
                last_error = f"Error {resp.status_code}: {resp.text}"
                continue
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed for {model_name}: {e}")
            last_error = str(e)
            continue
    
    # If all models failed, raise the last error
    raise HTTPException(status_code=500, detail=f"All Gemini models failed. Last error: {last_error}")


# ========= ALTERNATIVE: List Available Models (for debugging) =========
def list_available_models():
    """List all available Gemini models for debugging."""
    if not GOOGLE_API_KEY:
        return []
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={GOOGLE_API_KEY}"
    
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            models = data.get("models", [])
            available = []
            for m in models:
                name = m.get("name", "").replace("models/", "")
                methods = m.get("supportedGenerationMethods", [])
                if "generateContent" in methods:
                    available.append(name)
            return available
        else:
            print(f"❌ Failed to list models: {resp.text}")
            return []
    except Exception as e:
        print(f"❌ Error listing models: {e}")
        return []


# ========= PROMPT TEMPLATE =========
PROMPT_TEMPLATE = """
You are an AI interview coach. Return JSON ONLY that matches this schema exactly:

{
  "fileName": "string",
  "duration": "string (mm:ss)",
  "overallScore": 0-100,
  "grade": "string",
  "performanceLevel": "string",
  "aiConfidence": 0-100,
  "speechQuality": 0-100,
  "keyStrengths": ["string"],
  "areasForImprovement": ["string"],
  "performanceBreakdown": [
    {"category":"string","score":0-100,"summary":"string","suggestions":["string"]}
  ],
  "immediateActionItems": ["string"],
  "longTermDevelopment": ["string"]
}

Guidelines:
- Be concise, specific, and encouraging. Avoid repetition.
- Use STAR-method advice when relevant.
- Keep each suggestion under 15 words.
- Ensure valid JSON (no markdown, no comments).
"""


# ========= GEMINI HANDLER (REST) =========
def gemini_feedback_json(transcript: str, emotion: str, conf: float, file_name: str, duration: str):
    """Generate structured JSON feedback via Gemini REST API."""
    if not GOOGLE_API_KEY:
        print("⚠️ Gemini feedback skipped (no API key).")
        return None

    prompt = f"""
    {PROMPT_TEMPLATE}

    DetectedEmotion: {emotion} (confidence {conf:.2f})

    Transcript:
    \"\"\"{transcript[:8000]}\"\"\"  # Shortened for faster responses
    """

    print("ℹ️ Calling Gemini via REST...")
    text = gemini_generate(prompt)
    if not text:
        raise HTTPException(status_code=500, detail="Empty response from Gemini REST API.")

    def _extract_and_parse_json(raw_text: str) -> dict:
        """Extract JSON from Gemini text response."""
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if not match:
            raise ValueError("No JSON found in Gemini response.")
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parse failed: {e}")
            raise e

    try:
        data = _extract_and_parse_json(text)
    except Exception:
        print("⚠️ Gemini JSON invalid. Retrying to enforce JSON format...")
        reformat_prompt = f"Reformat the following into valid JSON ONLY (no explanation):\n\n{text}"
        fixed_text = gemini_generate(reformat_prompt)
        data = _extract_and_parse_json(fixed_text)

    data["fileName"] = file_name
    data["duration"] = duration
    return data


def save_report(uid: str, payload: dict):
    """Save report to Firestore if available."""
    if not db:
        return None
    ref = (
        db.collection("users")
        .document(uid)
        .collection("interviews")
        .add({**payload, "createdAt": firestore.SERVER_TIMESTAMP})
    )
    return ref[1].id


# ========= DEBUG ROUTE (NEW) =========
@router.get("/debug/models")
async def debug_models():
    """List available Gemini models for debugging."""
    models = list_available_models()
    return {
        "available_models": models,
        "has_api_key": bool(GOOGLE_API_KEY),
        "recommended": "gemini-1.5-flash-latest or gemini-pro"
    }


# ========= MAIN ROUTE =========
@router.post("/analyze")
async def analyze_interview(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Form(default="demo-user")
):
    """
    Upload → (ffmpeg) → Whisper → Emotion → Gemini → (optional) Firestore.
    Returns structured JSON for UI.
    """
    try:
        os.makedirs("uploads", exist_ok=True)
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
            raw_path = tmp.name
            tmp.write(await file.read())
        wav_path = raw_path + ".wav"

        # Convert + duration
        to_wav(raw_path, wav_path)
        duration = probe_duration(raw_path) or probe_duration(wav_path)

        # 1️⃣ Transcription
        t0 = time.time()
        transcript = whisper_transcribe(wav_path)
        print(f"Whisper: {time.time()-t0:.2f}s")

        # 2️⃣ Emotion
        t0 = time.time()
        dominant_emotion, confidence, all_emotions = detect_emotion(wav_path)
        print(f"Emotion: {time.time()-t0:.2f}s")

        # 3️⃣ Gemini feedback via REST
        t0 = time.time()
        feedback = gemini_feedback_json(transcript, dominant_emotion, confidence, file.filename, duration)
        print(f"Gemini: {time.time()-t0:.2f}s")

        result = {
            "fileName": file.filename,
            "duration": duration,
            "transcript": transcript,
            "dominantEmotion": dominant_emotion,
            "emotionConfidence": round(confidence, 3),
            "allEmotions": all_emotions,
            "feedback": feedback,
        }

        report_id = save_report(user_id, result) if feedback else None
        if report_id:
            result["reportId"] = report_id

        # Cleanup
        def _cleanup():
            for p in (raw_path, wav_path):
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except Exception:
                    pass

        background.add_task(_cleanup)
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ UNHANDLED EXCEPTION in /analyze: {e}")
        raise HTTPException(status_code=500, detail=str(e))