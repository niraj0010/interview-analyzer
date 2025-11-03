# backend/routers/ai_practice.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime
import os
import json
import uuid
import google.generativeai as genai

from firebase_admin import firestore
from routers.analyze import (
    to_wav,
    probe_duration,
    whisper_transcribe,
)
from services.emotion_analyzer import analyze_emotion

router = APIRouter()
db = firestore.client()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

PRIMARY_MODEL = "gemini-2.5-flash"
FALLBACK_MODEL = "gemini-2.0-flash" 

BASE_DIR = os.path.abspath(os.path.join(os.getcwd(), "uploads", "practice"))
os.makedirs(BASE_DIR, exist_ok=True)


def _get_model():
    try:
        return genai.GenerativeModel(PRIMARY_MODEL)
    except Exception:
        return genai.GenerativeModel(FALLBACK_MODEL)


def _json_array(text: str):
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.split("\n", 1)[-1].strip()
    return json.loads(text)


# ---------------------- START PRACTICE ----------------------
@router.get("/practice/start")
def start_practice(role: str, uid: str):
    session_id = str(uuid.uuid4())
    prompt = f"""
    Generate exactly 8 realistic interview questions for a {role}.
    Return ONLY a JSON array of strings.
    """

    model = _get_model()
    try:
        res = model.generate_content(prompt)
        questions = _json_array(res.text)[:8]
    except:
        questions = [
            f"Tell me about yourself in {role}.",
            "Describe a challenge you solved.",
            "Tell me a time you failed.",
            "Walk me through a complex problem.",
            "Describe pressure tradeoffs.",
            "Strengths/Weaknesses?",
            "How do you improve skills?",
            f"Why are you a fit for {role}?"
        ]

    sess_dir = os.path.join(BASE_DIR, uid, session_id)
    os.makedirs(sess_dir, exist_ok=True)

    db.collection("users").document(uid).collection("practiceSessions").document(session_id).set({
        "role": role,
        "questions": questions,
        "createdAt": datetime.utcnow(),
        "complete": False,
        "perQuestion": []
    })

    return {"sessionId": session_id, "questions": questions}


# ---------------------- RECORD ANSWER ----------------------
@router.post("/practice/answer")
async def practice_answer(
    sessionId: str = Form(...),
    uid: str = Form(...),
    questionIndex: int = Form(...),
    question: str = Form(...),
    skipped: str = Form(...),
    file: UploadFile = File(None),
):

    session_ref = db.collection("users").document(uid).collection("practiceSessions").document(sessionId)
    snap = session_ref.get()

    if not snap.exists:
        raise HTTPException(404, "Session not found")

    data = snap.to_dict()
    per = data.get("perQuestion", [])

    # normalize skipped boolean
    is_skipped = skipped.lower() == "true"

    if is_skipped:
        per.append({
            "questionIndex": questionIndex,
            "question": question,
            "skipped": True,
            "timestamp": datetime.utcnow()
        })
        session_ref.update({"perQuestion": per})
        return {"ok": True}

    # must have audio
    if not file:
        raise HTTPException(400, "Missing audio file")

    sess_dir = os.path.join(BASE_DIR, uid, sessionId)
    os.makedirs(sess_dir, exist_ok=True)

    filename = f"q{questionIndex + 1}.webm"
    raw_path = os.path.join(sess_dir, filename)

    with open(raw_path, "wb") as f:
        f.write(await file.read())

    per.append({
        "questionIndex": questionIndex,
        "question": question,
        "skipped": False,
        "filePath": raw_path,
        "originalName": file.filename,
        "timestamp": datetime.utcnow()
    })

    session_ref.update({"perQuestion": per})
    return {"ok": True}


# ---------------------- FINISH & ANALYZE ----------------------
@router.post("/practice/finish")
def practice_finish(sessionId: str = Form(...), uid: str = Form(...)):

    session_ref = db.collection("users").document(uid).collection("practiceSessions").document(sessionId)
    snap = session_ref.get()

    if not snap.exists:
        raise HTTPException(404, "Session not found")

    data = snap.to_dict()
    questions = data.get("questions", [])
    answers = data.get("perQuestion", [])

    combined = []
    per_q = []

    for a in sorted(answers, key=lambda x: x["questionIndex"]):
        q_idx = a["questionIndex"]
        q_text = questions[q_idx]

        if a.get("skipped"):
            combined.append(f"Q{q_idx+1}: {q_text}\n[SKIPPED]")
            per_q.append({"questionIndex": q_idx, "question": q_text, "skipped": True})
            continue

        raw = a["filePath"]
        wav = raw + ".wav"

        to_wav(raw, wav)
        duration = probe_duration(raw)
        transcript = whisper_transcribe(wav)
        emo = analyze_emotion(wav)
        label, score = emo if isinstance(emo, tuple) else ("neutral", 0.5)

        combined.append(f"Q{q_idx+1}: {q_text}\n{transcript}")
        per_q.append({
            "questionIndex": q_idx,
            "question": q_text,
            "transcript": transcript,
            "skipped": False,
            "duration": duration,
            "emotion": {"label": label, "confidence": score},
        })

    transcript_text = "\n\n".join(combined)

    model = _get_model()
    summary_json = {}

    # --- ⬇️ CORRECTED PROMPT BLOCK ⬇️ ---
    if not model:
        print("‼️ ERROR: Gemini model could not be initialized. Check API key and configuration.")
        summary_json = {"error": "AI model unavailable"}
    else:
        try:
            # This is the correct prompt that uses your transcript
            prompt = f"""
            You are an AI interview coach. Analyze this full mock interview transcript.
            Some questions may be marked [SKIPPED] — ignore those when scoring.

            Transcript:
            \"\"\"{transcript_text[:18000]}\"\"\" 

            Return ONLY valid JSON with this schema:
            {{
              "overallScore": 0-100,
              "summary": "string",
              "strengths": ["string"],
              "weaknesses": ["string"],
              "recommendedImprovements": ["string"]
            }}
            """.strip()
            
            # --- We print it just to be safe ---
            print("--- DEBUG: Sending this text to Gemini ---")
            print(prompt)
            print("------------------------------------------")

            out = model.generate_content(prompt)
            raw_text = (out.text or "").strip()

            print(f"--- DEBUG: Received this raw text from Gemini ---")
            print(raw_text)
            print(f"-------------------------------------------------")

            if raw_text.startswith("```"):
                raw_text = raw_text.strip("`")
                raw_text = raw_text.split("\n", 1)[-1].strip()

            summary_json = json.loads(raw_text)

        except Exception as e:
            # --- This will now print the real error ---
            print(f"‼️‼️ SUMMARY GENERATION FAILED ‼️‼️")
            print(f"Error: {e}")
            print(f"‼️‼️ END OF ERROR ‼️‼️")
            summary_json = {"error": "Failed to generate AI summary."}
    
    # --- ⬆️ END OF CORRECTION ⬆️ ---

    session_ref.update({
        "complete": True,
        "completedAt": datetime.utcnow(),
        "summary": summary_json,
        "perQuestion": per_q
    })

    return {"status": "completed", "summary": summary_json, "perQuestion": per_q}