import os, json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

REWRITE_INSTRUCTIONS = """You are a world-class prompt editor.
Rewrite the user prompt using this structure:
Role, Goal, Task, Context, Examples (optional), Output, Rules.
- Be specific and add missing constraints if reasonable (length, tone, format).
- If key info is missing, include up to 3 short clarifying questions at the end.
Return JSON with fields:
- rewritten (string) -> concatenate the sections into one formatted string (do NOT return an object)
- questions (array of strings)
- score (integer 0-10)."""

def _normalize(data: dict) -> dict:
    rw = data.get("rewritten")
    if isinstance(rw, dict):
        order = ["Role","Goal","Task","Context","Examples","Output","Rules"]
        parts = []
        for k in order:
            if k in rw and rw[k]:
                parts.append(f"{k}: {rw[k]}")
        data["rewritten"] = "\n".join(parts) if parts else json.dumps(rw)
    return data

def rewrite_prompt(raw_prompt: str) -> dict:
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": REWRITE_INSTRUCTIONS},
            {"role": "user", "content": raw_prompt}
        ],
        temperature=0.2,
    )
    data = json.loads(r.choices[0].message.content)
    return _normalize(data)
