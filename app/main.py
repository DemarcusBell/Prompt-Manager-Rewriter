from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
import os, json

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="Prompt Manager")

class RewriteIn(BaseModel):
    prompt: str
    prefer_numbers: bool = True

@app.post("/rewrite")
def rewrite(inp: RewriteIn):
    try:
        system = (
            "You are a world-class prompt editor. Return JSON with keys: "
            '"rewritten" (object with Role, Goal, Task, Context, Output, Rules), '
            '"questions" (array of strings), "score" (0-10).'
        )
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": inp.prompt},
            ],
            temperature=0.2,
        )
        return json.loads(r.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

