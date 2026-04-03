from pydantic import BaseModel, model_validator
from typing import List, Optional
from datetime import datetime
from schemas.questions import QuestionCreate

class ExamBase(BaseModel):
    title: str
    description: str
    access_code: str
    duration_minutes: int = 30
    total_marks: int
    passing_marks: int

class ExamCreate(ExamBase):
    pass

class ExamCreateBatch(ExamBase):
    questions: List[QuestionCreate] = []

    @model_validator(mode="after")
    def validate_marks_integrity(self):
        if self.passing_marks >= self.total_marks:
            raise ValueError("passing_marks must be less than total_marks")
        if self.questions:
            total_points = sum(q.points for q in self.questions)
            if total_points != self.total_marks:
                raise ValueError(
                    f"Sum of question points ({total_points}) must equal total_marks ({self.total_marks})"
                )
        return self

class ExamResponse(ExamBase):
    id: int
    teacher_id: int
    created_at: datetime

    class Config:
        from_attributes = True
