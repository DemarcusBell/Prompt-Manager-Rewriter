from typing import List, Any
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    project_name: str = "Prompt Manager"
    version: str = "1.0.0"

    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = True

    # Accept CSV in env (CORS_ORIGINS) OR a JSON array
    cors_origins: List[str] = Field(
        default_factory=lambda: ["https://chat.openai.com", "https://chatgpt.com"]
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
