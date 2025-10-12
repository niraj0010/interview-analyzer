# 🎙️ Interview Analyzer Backend

FastAPI-based backend for the **Interview Analyzer** app.  
This backend manages audio/video uploads, links them to users (via Firebase Auth UID), stores data locally during development, and will later connect with Whisper and Gemini APIs for transcription and feedback.

---

##  Tech Stack

- **FastAPI** — Backend framework  
- 
- **Firebase Auth** — User authentication (frontend)  
- **Local Storage** — Saves uploads to `/uploads`  
- *(Upcoming)* Whisper / XLSR / Gemini AI integration

---

## Create and activate virtual environment

python -m venv venv
# Activate
venv\Scripts\activate      # Windows
# or
source venv/bin/activate   # macOS/Linux


Run the server :

uvicorn main:app --reload


