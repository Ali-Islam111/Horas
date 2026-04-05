from pydantic import BaseModel
from typing import Dict, Literal, Optional, Any
from datetime import datetime

class StudentAnswerSubmit(BaseModel):
    answers: Dict[str, str] # e.g. {"1": "Stack", "2": "O(n log n)"} mapping question_id (as str) to selected choice text

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
    ai_ready_at: Optional[datetime] = None
    has_report: bool = False                # ← replaces report_path

    class Config:
        from_attributes = True

    """
    The frontend never needs the path. It only needs to know whether to show a "Download" button.
    The actual path stays on the server, looked up fresh from the DB at download time.
    """
    @classmethod
    def model_validate(cls, obj, **kwargs):
        # Compute has_report from the ORM object before Pydantic serializes it
        data = super().model_validate(obj, **kwargs)
        data.has_report = bool(getattr(obj, 'report_path', None))
        return data

class SubmissionResult(BaseModel):
    message: str
    score: float
    total_questions: int

class AIStatusResponse(BaseModel):
    session_id: int
    status: Literal["waiting", "initializing", "ready", "failed"]

class ReportListItem(BaseModel):
    id: int
    exam_id: int
    user_id: int
    status: str
    final_score: Optional[float]
    submitted_at: Optional[datetime]
    has_report: bool = False

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kwargs):
        # Compute has_report from the ORM object before Pydantic serializes it
        data = super().model_validate(obj, **kwargs)
        data.has_report = bool(getattr(obj, 'report_path', None))
        return data