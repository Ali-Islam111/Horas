from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from core.database import Base

class Session(Base):
    __tablename__="sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)

    status = Column(String, nullable=False, default="in_progress") # 'started', 'in_progress', 'completed'

    # defaulting to an empty dict when the session starts
    student_answers = Column(JSON, nullable=False, default=dict)

    final_score = Column(Float, nullable=True) # is calculated at the end

    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    submitted_at = Column(DateTime, nullable=True)

    # Relationships: The "Many" side looking back at the "One" side.
    user = relationship("User", back_populates="sessions")
    exam = relationship("Exam", back_populates="sessions")

    # Relationship : the "one" side looking at the "Many" events.
    # # If a session is deleted, delete all of its cheating logs too.
    events = relationship("Event", back_populates="session", cascade="all, delete-orphan")