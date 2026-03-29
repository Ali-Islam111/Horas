from pydantic import BaseModel, field_validator
from typing import List, Dict, Any, Optional

class QuestionBase(BaseModel):
    question_text: str
    question_type: str
    choice: List[str]  # e.g. ["A", "B", "C", "D"] or something similar
    points: int = 1

class QuestionCreate(QuestionBase):
    correct_choice: str

    @field_validator('correct_choice')
    @classmethod
    def validate_correct_choice(cls, v):
        v = v.strip().upper()
        if not v.isalpha() or len(v) != 1:
            raise ValueError("correct_choice must be a single letter (e.g., A, B, C, D)")
        return v

class QuestionResponse(QuestionBase):
    id: int
    exam_id: int

    
    class Config:
        from_attributes = True

class QuestionTeacherResponse(QuestionResponse):
    correct_choice: str
