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

# Where raw audio is stored
BASE_DIR = os.path.abspath(os.path.join(os.getcwd(), "uploads", "practice"))
os.makedirs(BASE_DIR, exist_ok=True)


# ---------------------- Helper Functions ----------------------
def _get_model():
    try:
        return genai.GenerativeModel(PRIMARY_MODEL)
    except Exception:
        try:
            return genai.GenerativeModel(FALLBACK_MODEL)
        except Exception as e:
            print("Gemini unavailable:", e)
            return None


def _json_array(text: str):
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.split("\n", 1)[-1].strip()
    return json.loads(text)


# ---------------------- Routes ----------------------
@router.get("/practice/start")
def start_practice(role: str, uid: str):
    """Create a new practice session and generate 8 questions."""
    session_id = str(uuid.uuid4())
    prompt = f"""
    Generate exactly 8 realistic interview questions for a {role}.
    Return ONLY a JSON array of strings. No extra explanation.
    """

    model = _get_model()
    if not model:
        questions = [
            f"Tell me about yourself and your background in {role}.",
            "Describe a challenging problem you solved.",
            "Walk me through a project you're proud of.",
            "Tell me about a time you received difficult feedback.",
            "Explain a trade-off you made under pressure.",
            "What are your strengths and weaknesses?",
            f"How do you stay current in {role} trends?",
            f"Why should we hire you for {role}?",
        ]
    else:
        try:
            res = model.generate_content(prompt)
            questions = _json_array(res.text)
            questions = questions[:8]
        except Exception:
            questions = [
                f"Tell me about yourself and your background in {role}.",
                "Describe a challenging problem you solved.",
                "Walk me through a project you're proud of.",
                "Tell me about a time you received difficult feedback.",
                "Explain a trade-off you made under pressure.",
                "What are your strengths and weaknesses?",
                f"How do you stay current in {role} trends?",
                f"Why should we hire you for {role}?",
            ]

    # Create local folder
    sess_dir = os.path.join(BASE_DIR, uid, session_id)
    os.makedirs(sess_dir, exist_ok=True)

    # Create Firestore session document
    db.collection("users").document(uid).collection("practiceSessions").document(session_id).set({
        "role": role,
        "questions": questions,
        "createdAt": datetime.utcnow(),
        "complete": False,
        "answers": []
    })

    return JSONResponse(content={"sessionId": session_id, "questions": questions})


# --------------------------------------------------------------------
@router.post("/practice/answer")
async def practice_answer(
    sessionId: str = Form(...),
    uid: str = Form(...),
    questionIndex: int = Form(...),
    question: str = Form(...),
    skipped: bool = Form(...),
    file: UploadFile = File(None),
):
    """Store each individual answer's metadata (not analyze yet)."""
    if not uid or not sessionId:
        raise HTTPException(400, "Missing uid/sessionId")

    session_ref = (
        db.collection("users").document(uid)
        .collection("practiceSessions").document(sessionId)
    )
    if not session_ref.get().exists:
        raise HTTPException(404, "Session not found")

    # Skip case
    if skipped and skipped in ("true", "True", True):
        session_ref.update({
            "answers": firestore.ArrayUnion([{
                "questionIndex": questionIndex,
                "question": question,
                "skipped": True,
                "timestamp": datetime.utcnow()
            }])
        })
        return JSONResponse(content={"ok": True, "skipped": True})

    # Upload path for audio
    if not file:
        raise HTTPException(400, "Missing audio file")

    sess_dir = os.path.join(BASE_DIR, uid, sessionId)
    os.makedirs(sess_dir, exist_ok=True)

    filename = f"q{int(questionIndex) + 1}.webm"
    raw_path = os.path.join(sess_dir, filename)

    with open(raw_path, "wb") as f:
        f.write(await file.read())

    session_ref.update({
        "answers": firestore.ArrayUnion([{
            "questionIndex": questionIndex,
            "question": question,
            "skipped": False,
            "filePath": raw_path,
            "originalName": file.filename,
            "timestamp": datetime.utcnow()
        }])
    })

    return JSONResponse(content={"ok": True, "skipped": False})


# --------------------------------------------------------------------
@router.post("/practice/finish")
def practice_finish(sessionId: str = Form(...), uid: str = Form(...)):
    """At the end, analyze all answers and return summarized feedback."""
    if not uid or not sessionId:
        raise HTTPException(400, "Missing uid/sessionId")

    session_ref = (
        db.collection("users").document(uid)
        .collection("practiceSessions").document(sessionId)
    )
    snapshot = session_ref.get()
    if not snapshot.exists:
        raise HTTPException(404, "Session not found")

    data = snapshot.to_dict()
    questions = data.get("questions", [])
    answers = data.get("answers", [])

    combined_lines = []
    per_q = []

    # Process answers sequentially
    for a in sorted(answers, key=lambda x: x["questionIndex"]):
        q_idx = int(a["questionIndex"])
        q_text = a.get("question") or (
            questions[q_idx] if q_idx < len(questions) else f"Question {q_idx + 1}"
        )

        if a.get("skipped"):
            combined_lines.append(f"Q{q_idx + 1}: {q_text}\n[SKIPPED]")
            per_q.append({"questionIndex": q_idx, "question": q_text, "skipped": True})
            continue

        raw_path = a.get("filePath")
        if not raw_path or not os.path.exists(raw_path):
            combined_lines.append(f"Q{q_idx + 1}: {q_text}\n[ERROR: audio missing]")
            per_q.append({
                "questionIndex": q_idx,
                "question": q_text,
                "skipped": False,
                "error": "audio missing"
            })
            continue

        wav_path = raw_path + ".wav"
        try:
            to_wav(raw_path, wav_path)
            duration = probe_duration(raw_path) or ""
            transcript = whisper_transcribe(wav_path)

            emo = analyze_emotion(wav_path)
            label, score = emo if isinstance(emo, tuple) else (str(emo), 0.8)

            combined_lines.append(f"Q{q_idx + 1}: {q_text}\n{transcript}")
            per_q.append({
                "questionIndex": q_idx,
                "question": q_text,
                "skipped": False,
                "transcript": transcript,
                "emotion": {"label": label, "confidence": float(score)},
                "duration": duration
            })
        finally:
            if os.path.exists(wav_path):
                try:
                    os.remove(wav_path)
                except Exception:
                    pass

    merged = "\n\n".join(combined_lines).strip()
    model = _get_model()
    summary_json = None

    if model:
        summary_prompt = f"""
You are an AI interview coach. Analyze this full mock interview transcript.
Some questions may be marked [SKIPPED] — ignore those when scoring.

Return JSON ONLY that matches this schema exactly:

{{
  "overallScore": 0-100,
  "grade": "string",
  "performanceLevel": "string",
  "aiConfidence": 0-100,
  "speechQuality": 0-100,
  "keyStrengths": ["string"],
  "areasForImprovement": ["string"],
  "performanceBreakdown": [
    {{"category":"string","score":0-100,"summary":"string","suggestions":["string"]}}
  ],
  "immediateActionItems": ["string"],
  "longTermDevelopment": ["string"],
  "summary": "string"
}}

Guidelines:
- Be concise, specific, and encouraging. Avoid repetition.
- Use STAR-method advice when relevant.
- Keep each suggestion under 15 words.
- Ensure valid JSON (no markdown, no comments).
- Grade: A (85-100), B+ (70-84), B (60-69), C (50-59), D (below 50)
- Performance levels: "Exceptional", "Strong", "Competent", "Developing", "Needs Improvement"
- Include 3-5 items in each array field
- PerformanceBreakdown should cover: Communication, Technical Knowledge, Problem-Solving, Professionalism

Transcript:
\"\"\"{merged[:18000]}\"\"\"
""".strip()

        try:
            out = model.generate_content(summary_prompt)
            raw_text = (out.text or "").strip()
            if raw_text.startswith("```"):
                raw_text = raw_text.strip("`")
                raw_text = raw_text.split("\n", 1)[-1].strip()
            summary_json = json.loads(raw_text)
        except Exception as e:
            print("Summary generation failed:", e)
            summary_json = None

    # Save summary + mark complete
    session_ref.update({
        "complete": True,
        "completedAt": datetime.utcnow(),
        "summary": summary_json,
        "perQuestion": per_q
    })

    # Always return valid JSON
    return JSONResponse(content={
        "status": "completed",
        "summary": summary_json or {},
        "perQuestion": per_q
    })