# backend/routers/ai_practice.py

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime
import os
import json
import uuid
import tempfile
import google.generativeai as genai

from firebase_admin import firestore

from routers.analyze import (
    to_wav,
    probe_duration,
    whisper_transcribe,
    gemini_feedback_json,
)
from services.emotion_analyzer import analyze_emotion

router = APIRouter()
db = firestore.client()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

PRIMARY_MODEL = "gemini-2.5-flash"
FALLBACK_MODEL = "gemini-1.5-flash"


def _get_model():
    try:
        return genai.GenerativeModel(PRIMARY_MODEL)
    except:
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


@router.get("/practice/start")
def start_practice(role: str, uid: str):
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
        except:
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

    db.collection("users").document(uid).collection("practiceSessions").document(session_id).set({
        "role": role,
        "questions": questions,
        "createdAt": datetime.utcnow(),
        "complete": False,
        "answers": []
    })

    return {"sessionId": session_id, "questions": questions}


@router.post("/practice/answer")
async def practice_answer(
    sessionId: str = Form(...),
    uid: str = Form(...),
    questionIndex: int = Form(...),
    question: str = Form(...),
    skipped: bool = Form(...),
    file: UploadFile = File(None),
):
    if not uid or not sessionId:
        raise HTTPException(400, "Missing uid/sessionId")

    session_ref = (
        db.collection("users").document(uid)
        .collection("practiceSessions").document(sessionId)
    )

    if skipped:
        session_ref.update({
            "answers": firestore.ArrayUnion([{
                "questionIndex": questionIndex,
                "question": question,
                "skipped": True,
                "timestamp": datetime.utcnow()
            }])
        })
        return {"status": "skipped"}

    if not file:
        raise HTTPException(400, "Missing audio")

    with tempfile.NamedTemporaryFile(delete=False, suffix=file.filename) as tmp:
        raw = tmp.name
        tmp.write(await file.read())
    wav = raw + ".wav"

    try:
        to_wav(raw, wav)
        duration = probe_duration(raw) or ""
        transcript = whisper_transcribe(wav)

        emo = analyze_emotion(wav)
        if isinstance(emo, tuple):
            label, score = emo
        else:
            label, score = str(emo), 0.8

        feedback = gemini_feedback_json(
            transcript, label, score, file.filename, duration
        )

        session_ref.update({
            "answers": firestore.ArrayUnion([{
                "questionIndex": questionIndex,
                "question": question,
                "skipped": False,
                "transcript": transcript,
                "emotion": {"label": label, "confidence": score},
                "feedback": feedback,
                "duration": duration,
                "timestamp": datetime.utcnow()
            }])
        })

        return {
            "transcript": transcript,
            "emotion": {"label": label, "confidence": score},
            "feedback": feedback,
            "duration": duration,
        }

    finally:
        for p in (raw, wav):
            try:
                os.remove(p)
            except:
                pass


@router.post("/practice/finish")
def practice_finish(sessionId: str = Form(...), uid: str = Form(...)):
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
    answers = data.get("answers", [])

    combined = []
    for a in sorted(answers, key=lambda x: x["questionIndex"]):
        if a.get("skipped"):
            combined.append(f"Q{a['questionIndex']}: {a['question']}\n[SKIPPED]")
        else:
            combined.append(f"Q{a['questionIndex']}: {a['question']}\n{a['transcript']}")

    merged = "\n\n".join(combined)

    model = _get_model()
    summary_json = None

    if model:
        summary_prompt = f"""
Analyze this full mock interview:

{merged}

Return ONLY valid JSON:
{{
  "overallScore": 0-100,
  "summary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendedImprovements": ["string"]
}}
"""

        try:
            out = model.generate_content(summary_prompt)
            summary_json = json.loads(out.text.strip())
        except Exception as e:
            print("Summary generation failed:", e)

    session_ref.update({
        "complete": True,
        "completedAt": datetime.utcnow(),
        "summary": summary_json
    })

    return {"status": "completed", "summary": summary_json}
