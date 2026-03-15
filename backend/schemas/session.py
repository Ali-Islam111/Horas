from pydantic import BaseModel
from typing import Dict, Optional, Any
from datetime import datetime

class StudentAnswerSubmit(BaseModel):
    answers: Dict[str, str] # e.g. {"1": "A", "2": "C"} mapping question_id (as str) to selected choice

class SessionBase(BaseModel):
    exam_id: int
    user_id: int

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    id: int
    status: str
    student_answers: Dict[str, Any]
    final_score: Optional[float]
    started_at: datetime
    submitted_at: Optional[datetime]

    class Config:
        from_attributes = True

class SubmissionResult(BaseModel):
    message: str
    score: float
    total_questions: int
