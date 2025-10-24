#!/usr/bin/env python3
"""
Updated test script for Gemini 2.0/2.5 models
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def test_new_gemini_models():
    """Test the newer Gemini 2.0/2.5 models that you have access to."""
    
    if not GOOGLE_API_KEY:
        print("❌ GOOGLE_API_KEY not found in environment variables!")
        return
    
    print(f"✅ Found API Key: {GOOGLE_API_KEY[:8]}...{GOOGLE_API_KEY[-4:]}")
    print("\n" + "="*50)
    print("TESTING GEMINI 2.0/2.5 MODELS")
    print("="*50 + "\n")
    
    # Test the models that actually exist in your output
    test_models = [
        "gemini-2.5-flash",           # Newest flash model
        "gemini-2.0-flash",           # Stable 2.0 version
        "gemini-flash-latest",        # Always latest
        "gemini-2.5-flash-lite",      # Lite version for faster responses
        "gemini-2.0-flash-001",       # Specific version
        "gemini-pro-latest",          # Pro model latest
    ]
    
    # Test with a JSON generation prompt (what your app needs)
    test_prompt = {
        "contents": [{
            "parts": [{
                "text": """Return this exact JSON:
{
  "overallScore": 85,
  "grade": "B+",
  "performanceLevel": "Good",
  "keyStrengths": ["Clear communication"],
  "areasForImprovement": ["More specific examples"]
}"""
            }]
        }]
    }
    
    working_models = []
    
    for model_name in test_models:
        print(f"🔍 Testing {model_name}...", end=" ")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GOOGLE_API_KEY}"
        
        try:
            resp = requests.post(url, json=test_prompt, timeout=30)
            if resp.status_code == 200:
                print("✅ WORKS!")
                working_models.append(model_name)
                # Try to parse response
                try:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    # Check if it can generate JSON properly
                    try:
                        parsed = json.loads(text)
                        print(f"   ✓ JSON generation works! Score: {parsed.get('overallScore', 'N/A')}")
                    except:
                        print(f"   ⚠️ Response received but not valid JSON")
                except:
                    pass
            elif resp.status_code == 404:
                print("❌ NOT FOUND")
            else:
                print(f"❌ ERROR {resp.status_code}")
        except Exception as e:
            print(f"❌ FAILED: {str(e)[:50]}")
    
    # Summary
    print("\n" + "="*50)
    print("RECOMMENDED CONFIGURATION")
    print("="*50 + "\n")
    
    if working_models:
        print("✅ Working models found!\n")
        print(f"🎯 BEST CHOICE: '{working_models[0]}'")
        print("\n📝 Update your analyze.py file:")
        print("="*40)
        print(f"""
def gemini_generate(prompt: str, model: str = "{working_models[0]}") -> str:
    \"\"\"Use REST API for Gemini (AI Studio key format).\"\"\"
    if not GOOGLE_API_KEY:
        print("⚠️  GOOGLE_API_KEY missing — Gemini skipped.")
        return None

    # Using the new Gemini 2.5 model
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{working_models[0]}:generateContent?key={{GOOGLE_API_KEY}}"
    
    # ... rest of your code
""")
        print("="*40)
        print("\n✅ Available models for fallback:")
        for model in working_models:
            print(f"   • {model}")
    else:
        print("❌ No working models found!")

if __name__ == "__main__":
    test_new_gemini_models()