from transformers import pipeline

emotion_model = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    return_all_scores=False
)

def analyze_emotion(text: str):
    result = emotion_model(text[:512])  # limit to 512 tokens
    return result[0]
