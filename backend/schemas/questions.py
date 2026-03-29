from pydantic import BaseModel, field_validator, model_validator
from typing import List, Dict, Any, Optional

class QuestionBase(BaseModel):
    question_text: str
    question_type: str
    choice: List[str]  # e.g. ["Queue", "Stack", "Tree", "Graph"]
    points: int = 1

class QuestionCreate(QuestionBase):
    correct_choice: str

    @field_validator("correct_choice")
    @classmethod
    def validate_correct_choice(cls, v):
        v = str(v).strip()
        if not v:
            raise ValueError("correct_choice is required")
        return v

    @model_validator(mode="after")
    def validate_correct_choice_exists_in_options(self):
        normalized_choices = {str(opt).strip().casefold() for opt in self.choice if str(opt).strip()}
        normalized_correct = str(self.correct_choice).strip().casefold()
        if normalized_correct not in normalized_choices:
            raise ValueError("correct_choice must match one of the provided choice values")
        return self

class QuestionResponse(QuestionBase):
    id: int
    exam_id: int

    
    class Config:
        from_attributes = True

class QuestionTeacherResponse(QuestionResponse):
    correct_choice: str
