from typing import Any, Dict, Optional, Union
from pydantic import BaseModel, Field


class RewriteReq(BaseModel):
    prompt: str = Field(..., min_length=1)
    mode: str = Field(
        default="plain",
        description="Rewrite mode: plain | study_notes | resume",
    )
    prefer_numbers: bool = True


class RewriteRes(BaseModel):
    rewritten: Union[str, Dict[str, Any]]
    score: Optional[float] = None
