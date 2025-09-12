
from pydantic import BaseModel, Field

class RewriteOut(BaseModel):
    rewritten: str = Field(..., description="The upgraded prompt")
    questions: list[str] = Field(default_factory=list)
    score: int = Field(..., ge=0, le=10)

class AskIn(BaseModel):
    prompt: str
    prefer_numbers: bool = True
