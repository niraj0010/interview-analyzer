from fastapi import APIRouter, UploadFile, File, Form
from services.gemini_interviewer import generate_questions
from services.transcriber import transcribe_audio      # <- Whisper service
from services.emotion_analyzer import analyze_emotion  # <- Emotion model
import google.generativeai as genai
import os

router = APIRouter()

# --- Practice Start ---
@router.get("/practice/start")
def start_practice(role: str):
    """Start a practice session and generate role-based questions"""
    try:
        questions = generate_questions(role)
        return {"role": role, "questions": questions}
    except Exception as e:
        return {"error": str(e)}

# --- Practice Submit ---
@router.post("/practice/submit")
async def submit_practice(
    file: UploadFile = File(...),
    role: str = Form(...),
    question: str = Form(...)
):
    """
    Process a user's spoken answer:
    1. Transcribe audio (Whisper)
    2. Detect emotion
    3. Generate feedback via Gemini
    """

    # --- Step 1: Save audio temporarily ---
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())

    # --- Step 2: Transcribe audio ---
    transcript = transcribe_audio(temp_path)

    # --- Step 3: Emotion analysis ---
    emotion = analyze_emotion(temp_path)

    # --- Step 4: Gemini feedback ---
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = f"""
    You are an AI interview coach.
    Candidate was asked: "{question}"
    Transcript of their answer: "{transcript}"
    Detected emotion: {emotion}

    Evaluate the response on 3 factors:
    - Clarity (0–1)
    - Relevance (0–1)
    - Confidence (0–1)

    Then summarize feedback in 2–3 sentences.
    Return JSON strictly in this format:
    {{
      "clarity": <float>,
      "relevance": <float>,
      "confidence": <float>,
      "feedback": "<string>"
    }}
    """

    try:
        response = model.generate_content(prompt)
        feedback = response.text
    except Exception as e:
        feedback = f"Gemini error: {e}"

    # --- Step 5: Clean up and return ---
    os.remove(temp_path)
    return {
        "question": question,
        "transcript": transcript,
        "emotion": emotion,
        "feedback": feedback
    }
