from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from models.events import Event
from schemas.events import EventCreate, EventOut

# The Passive Receiver of the AI Proctoring

router = APIRouter(
    prefix="/events",
    tags=["Proctoring Events"]
)

@router.post("/log", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def log_event(event_in: EventCreate, db: Session = Depends(get_db)):
    """
    Step 5 (Simultaneous AI): The AI Engine calls this endpoint whenever it detects an anomaly.
    
    The 'event_in' parameter automatically intercepts the JSON, validates it against 
    the EventCreate schema, and returns a 422 error if the AI sent bad data.
    """
    # 1. Unpack the validated JSON data into the SQLAlchemy model
    # .model_dump() is the Pydantic v2 way of turning the schema into a dictionary
    new_event = Event(**event_in.model_dump())
    
    # 2. Save it to the database
    db.add(new_event)
    db.commit()
    
    # 3. Refresh to get the generated database ID, then return it
    db.refresh(new_event)
    return new_event

