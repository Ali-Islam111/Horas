from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from core.database import Base

class User(Base):
  
    __tablename__ = "users"

    # Attributes
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="student") 
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # 3. Relationships:
    # •	takes (1:N): A User (student) can have multiple sessions.
    
    # Query Example: `my_user.sessions` to get all exams they've taken!
    # "back_populates": the Session model will have a variable called "user" pointing back here.
    sessions = relationship("Session", back_populates="user")