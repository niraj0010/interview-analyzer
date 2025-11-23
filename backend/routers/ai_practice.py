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


def _get_last_session_for_role(uid: str, role: str):
    """
    Look up the most recent practice session for a given user+role
    from existing practiceSessions collection.
    """
    coll = (
        db.collection("users")
        .document(uid)
        .collection("practiceSessions")
    )

    try:
        # Filter by role and order by createdAt desc
        query = (
            coll.where("role", "==", role)
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(1)
        )
        docs = list(query.stream())
        if not docs:
            return None, None
        doc = docs[0]
        return doc.id, doc.to_dict()
    except Exception as e:
        print(f"[practice] Failed to fetch last session for role={role}: {e}")
        return None, None


# ---------------------- START PRACTICE (ADAPTIVE) ----------------------
@router.get("/practice/start")
def start_practice(
    role: str, 
    uid: str,
    difficulty: str = "adaptive", # adaptive, easy, medium, hard
    focus: str = "general"        # general, technical, behavioral, weakness_remediation
):
    """
    Start a new practice round for a role with tunable difficulty/focus.
    """
    session_id = str(uuid.uuid4())

    # Look up last round for this role (if any)
    last_doc_id, last_data = _get_last_session_for_role(uid, role)

    prev_round = 0
    prev_score = None
    prev_weaknesses = []

    if last_data:
        prev_round = last_data.get("roundNumber", 0)
        summary = last_data.get("summary") or {}
        prev_score = summary.get("overallScore")
        prev_weaknesses = summary.get("weaknesses", []) or []

    # New round number
    round_number = (prev_round or 0) + 1
    
    # --- 1. Build Difficulty Prompt ---
    diff_instruction = ""
    if difficulty == "easy":
        diff_instruction = "Keep questions fundamental, beginner-friendly, and forgiving."
    elif difficulty == "medium":
        diff_instruction = "Standard industry interview difficulty."
    elif difficulty == "hard":
        diff_instruction = "Very challenging. Include complex edge cases, system design depth, and stress-test questions."
    else: 
        # "adaptive" default
        if prev_round == 0:
            diff_instruction = "This is the candidate's first round. Keep it standard and foundational."
        else:
            diff_instruction = f"This is round {round_number}. Increase difficulty slightly from the previous round."

    # --- 2. Build Focus Prompt ---
    focus_instruction = ""
    weaknesses_text = ", ".join(prev_weaknesses) if prev_weaknesses else "None recorded"

    if focus == "technical":
        focus_instruction = "Focus 80% on technical hard skills, coding concepts, and domain knowledge."
    elif focus == "behavioral":
        focus_instruction = "Focus 80% on behavioral questions (STAR method), soft skills, and culture fit."
    elif focus == "weakness_remediation":
        if prev_weaknesses:
            focus_instruction = f"CRITICAL: The candidate previously failed at: {weaknesses_text}. Generate questions SPECIFICALLY targeting these weak areas to test improvement."
        else:
            focus_instruction = "Focus on general competency (no previous weaknesses found to target)."
    else:
        # "general"
        if prev_weaknesses and difficulty == "adaptive":
             focus_instruction = f"Mix technical and behavioral. Give slight attention to previous weaknesses: {weaknesses_text}."
        else:
             focus_instruction = "Balanced mix of behavioral and technical questions."

    prompt = f"""
    You are an expert AI interview coach.
    Role: {role}
    Round: {round_number}
    
    CONFIGURATION:
    - Difficulty Strategy: {diff_instruction}
    - Focus Strategy: {focus_instruction}

    Task: Generate exactly 8 realistic interview questions.
    Return ONLY a JSON array of strings. No markdown, no keys, just the list.
    """

    model = _get_model()
    try:
        res = model.generate_content(prompt)
        questions = _json_array(res.text)[:8]
    except Exception as e:
        print(f"[practice/start] Gemini failed, using fallback. Error: {e}")
        questions = [
            f"Tell me about yourself in the context of {role}.",
            "Describe a challenging problem you solved recently.",
            "Tell me about a time you failed and what you learned.",
            "Walk me through a complex decision you had to make.",
            "Describe a time you had to manage conflicting priorities.",
            "What are your key strengths and weaknesses for this role?",
            "How do you actively improve your skills and stay current?",
            f"Why are you a strong fit for this {role} position?"
        ]

    # Ensure we always have 8 questions
    if len(questions) < 8:
        while len(questions) < 8:
            questions.append("Describe a recent professional challenge and how you handled it.")

    sess_dir = os.path.join(BASE_DIR, uid, session_id)
    os.makedirs(sess_dir, exist_ok=True)

    # Save Session Metadata
    db.collection("users").document(uid).collection("practiceSessions").document(session_id).set({
        "role": role,
        "roundNumber": round_number,
        "config": {
            "difficulty": difficulty,
            "focus": focus
        },
        "basedOnSessionId": last_doc_id,
        "basedOnWeaknesses": prev_weaknesses,
        "previousScore": prev_score,
        "questions": questions,
        "createdAt": datetime.utcnow(),
        "complete": False,
        "perQuestion": []
    })

    return {
        "sessionId": session_id,
        "questions": questions,
        "roundNumber": round_number,
        "config": {"difficulty": difficulty, "focus": focus},
        "previousRound": prev_round,
    }


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
        # safe guard if old doc doesn't have this index
        if q_idx < len(questions):
            q_text = questions[q_idx]
        else:
            q_text = f"Question {q_idx+1}"

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

    if not model:
        print("‼️ ERROR: Gemini model could not be initialized. Check API key and configuration.")
        summary_json = {"error": "AI model unavailable"}
    else:
        try:
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

            print("--- DEBUG: Sending this text to Gemini ---")
            print(prompt)
            print("------------------------------------------")

            out = model.generate_content(prompt)
            raw_text = (out.text or "").strip() 

            if raw_text.startswith("```"):
                raw_text = raw_text.strip("`")
                raw_text = raw_text.split("\n", 1)[-1].strip()

            summary_json = json.loads(raw_text)

        except Exception as e:
            print(f"‼️‼️ SUMMARY GENERATION FAILED ‼️‼️")
            print(f"Error: {e}")
            summary_json = {"error": "Failed to generate AI summary."}

    # Persist completion + summary + per-question results
    session_ref.update({
        "complete": True,
        "completedAt": datetime.utcnow(),
        "summary": summary_json,
        "perQuestion": per_q
    })

    return {"status": "completed", "summary": summary_json, "perQuestion": per_q}