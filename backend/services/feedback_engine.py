def compute_feedback(transcript, emotion_result):
    word_count = len(transcript.split())
    clarity = "Good" if word_count > 15 else "Needs Detail"
    confidence = "High" if emotion_result["label"] in ["joy", "confidence"] else "Neutral"
    return {
        "clarity": clarity,
        "confidence": confidence,
        "word_count": word_count,
        "emotion": emotion_result["label"]
    }
