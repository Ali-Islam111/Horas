from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from core.database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id= Column(Integer,ForeignKey("exams.id"), nullable=False)
    question_text= Column(String, nullable=False)
    question_type= Column(String, nullable=False)  # Leave as string so we can include other question types in the future
    choice= Column(JSON, nullable=False) # 4 choices for each MCQ
    correct_choice= Column(String, nullable=False)
    points = Column(Integer, nullable=False, default=1)


    # belongs to (N:1): Multiple Questions belong to one exams record
    exam = relationship("Exam", back_populates="questions")

    