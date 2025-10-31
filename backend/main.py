from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, transcribe, emotion, analyze, ai_practice 
from dotenv import load_dotenv  
import os                      

app = FastAPI(title="Interview Analyzer Backend")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(upload.router)
app.include_router(transcribe.router)
app.include_router(emotion.router)
app.include_router(analyze.router)
app.include_router(ai_practice.router)  

@app.get("/")
def root():
    return {"message": "Backend running successfully!"}
