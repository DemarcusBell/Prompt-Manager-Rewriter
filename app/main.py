import time
from typing import Dict, Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .schemas import RewriteReq, RewriteRes


def build_rewrite(req: RewriteReq) -> Dict[str, Any]:
    """Deterministic 'rewrite' to produce a tidy structure.
    (You can later swap this for an LLM call—schema stays the same.)"""
    base = {
        "Role": {
            "plain": "Assistant",
            "study_notes": "Cybersecurity Instructor",
            "resume": "Resume Optimizer",
        }.get(req.mode, "Assistant"),
        "Goal": {
            "plain": "Rewrite with clarity and brevity.",
            "study_notes": "Produce concise Security study notes.",
            "resume": "Improve bullet impact, quantify results, and fit one page.",
        }.get(req.mode, "Rewrite with clarity and brevity."),
        "Task": {
            "plain": "Clean and structure the text.",
            "study_notes": "Summarize key points with definitions & one example.",
            "resume": "Refactor bullets to action + task + impact (+metric).",
        }.get(req.mode, "Clean and structure the text."),
        "Context": req.prompt.strip(),
        "Output": {
            "plain": "Short, actionable text.",
            "study_notes": "Bulleted notes: definition, why it matters, example.",
            "resume": "3–6 bullets per role, each with quantified impact.",
        }.get(req.mode, "Short, actionable text."),
        "Rules": "Number lists plainly like '1 2 3 4 5'." if req.prefer_numbers else "",
        "questions": [
            "Any critical constraints or length limits?",
            "Target audience and tone?",
            "Examples to include or avoid?",
        ],
    }
    return base


app = FastAPI(
    title=settings.project_name, version=settings.version, debug=settings.debug
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Simple timing/logging middleware
@app.middleware("http")
async def add_timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    path = request.url.path
    status = response.status_code
    print(f"[{status}] {path} {elapsed_ms:.1f}ms")
    return response


@app.get("/health")
def health() -> dict:
    return {"ok": True, "name": settings.project_name, "version": settings.version}


@app.post("/api/v1/rewrite", response_model=RewriteRes)
def rewrite(req: RewriteReq) -> RewriteRes:
    data = build_rewrite(req)
    return RewriteRes(rewritten=data, score=0.9)
