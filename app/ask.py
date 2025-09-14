import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

ANSWER_INSTRUCTIONS = (
    "You are precise and structured. Obey the provided format strictly. "
    "Return JSON with keys: answer (string), sections (array of strings)."
)


def ask_with_upgraded_prompt(upgraded_prompt: str) -> dict:
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": ANSWER_INSTRUCTIONS},
            {"role": "user", "content": upgraded_prompt},
        ],
        temperature=0.2,
    )
    return json.loads(r.choices[0].message.content)
