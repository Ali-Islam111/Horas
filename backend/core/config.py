from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):

    # Default values if these variables were found empty:
    API_PREFIX: str = "/api"
    DEBUG: bool = False
    
    # Safe fallback if .env is somehow missing
    DATABASE_URL: str = "sqlite:///./database.db"
    ALLOWED_ORIGINS: List[str] = []

    # Required variables (No defaults! Pydantic will force them to be in the .env)
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # mode="before" : it catches the string from the .env file and splits it before Pydantic strictly validates it
    # Union[str, List[str]] : tells the function that the incoming value v might be a raw String (from the .env file) OR it might already be a List.
    @field_validator("ALLOWED_ORIGINS", mode="before") 
    def parse_allowed_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and v:
            # Added .strip() just in case you have extra spaces in your .env like "url1, url2"
            return [origin.strip() for origin in v.split(",")]
        elif isinstance(v, list):
            return v
        return []
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

# the class instance that'll be imported and used a lot across the project
settings = Settings()