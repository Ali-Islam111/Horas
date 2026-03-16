from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):

    # Default values
    API_PREFIX: str = "/api"
    DEBUG: bool = False
    DATABASE_URL: str = "sqlite:///./horas_DB.db"


    # ALLOWED_ORIGINS is stored as a plain string in .env (comma-separated)
    # and converted to a list by the validator below.
    ALLOWED_ORIGINS: str = ""

    # Required variables (no defaults - Pydantic will raise an error if missing from .env)
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Google OAuth2 — optional (defaults allow the server to start without them)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://127.0.0.1:8000/api/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"

    # Use model_config (Pydantic v2 style) instead of inner Config class
    model_config = SettingsConfigDict(
        env_file=["../.env", ".env"],
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v) -> str:
        # Keep it as-is; we'll convert it during use
        return v if v else ""

    def get_allowed_origins(self) -> List[str]:
        """Returns ALLOWED_ORIGINS as a Python list. Use this in main.py."""
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

# the class instance that'll be imported and used across the project
settings = Settings()