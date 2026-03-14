from pydantic import BaseModel
from typing import Optional


class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = "student"


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True  # Pydantic v2: replaces orm_mode=True


# Schemas for JWT token responses
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
