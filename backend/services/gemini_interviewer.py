import google.generativeai as genai
import os, json

# Load Gemini API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def load_role_template(role: str):
    path = f"backend/data/role_templates/{role}.json"
    if not os.path.exists(path):
        print(f"⚠️  File not found at: {path}")
        return {"title": role}
    with open(path) as f:
        return json.load(f)

def generate_questions(role: str):
    template = load_role_template(role)
    try:
        # ✅ Updated Gemini model name
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f"""
        Generate 5 concise technical interview questions for a {template['title']} role.
        Focus areas: {', '.join(template.get('focus_areas', []))}.
        Return only the list of questions.
        """
        response = model.generate_content(prompt)

        return [q.strip("-• ") for q in response.text.split("\n") if q.strip()]

    except Exception as e:
        return [f"Gemini API error: {str(e)}"]

if __name__ == "__main__":
    print("Testing role template load...")
    print(load_role_template("software_developer"))
    print(generate_questions("software_developer"))
