from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# 1. The Base Rule (Shared fields)
class EventBase(BaseModel):
    session_id: int
    timestamp: datetime
    category: str
    description: str
    details: str
    evidence_url: Optional[str] = None

# 2. What the AI sends us (The Input)
class EventCreate(EventBase):
    pass # It uses exactly the same fields as EventBase.

# 3. What we send the Dashboard (The Output)
class EventOut(EventBase):
    id: int

    class Config:
        # This tells Pydantic to read data directly from your SQLAlchemy database model
        from_attributes = True