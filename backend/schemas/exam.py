from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ExamBase(BaseModel):
    title: str
    description: str
    access_code: str
    duration_minutes: int = 30

class ExamCreate(ExamBase):
    pass

class ExamResponse(ExamBase):
    id: int
    teacher_id: int
    created_at: datetime

    class Config:
        from_attributes = True
