from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from schemas.questions import QuestionCreate

class ExamBase(BaseModel):
    title: str
    description: str
    access_code: str
    duration_minutes: int = 30
    total_marks: int = 100
    passing_marks: int = 50

class ExamCreate(ExamBase):
    pass

class ExamCreateBatch(ExamBase):
    questions: List[QuestionCreate] = []

class ExamResponse(ExamBase):
    id: int
    teacher_id: int
    created_at: datetime

    class Config:
        from_attributes = True
