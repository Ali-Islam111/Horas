from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from core.database import Base

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    access_code = Column(String, nullable=False, unique=True, index=True) # Should be generated but for now it's gonna be filled.
    duration_minutes = Column(Integer, nullable=False, default=30)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships (The "1" side of the 1-to-Many):
    #    •	has (1:N): An Exam has multiple sessions.
    #    •	contains (1:N): An Exam contains multiple questions.

    # cascade="all, delete-orphan": deleting an exam deletes its sessions and questions
    sessions = relationship("Session", back_populates="exam", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")