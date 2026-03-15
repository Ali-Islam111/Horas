from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class QuestionBase(BaseModel):
    question_text: str
    question_type: str
    choice: List[str]  # e.g. ["A", "B", "C", "D"] or something similar

class QuestionCreate(QuestionBase):
    correct_choice: str

class QuestionResponse(QuestionBase):
    id: int
    exam_id: int
    
    class Config:
        from_attributes = True

class QuestionTeacherResponse(QuestionResponse):
    correct_choice: str
