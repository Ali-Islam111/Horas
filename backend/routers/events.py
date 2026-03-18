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

@router.post("/events/log", response_model=EventOut, status_code=status.HTTP_201_CREATED)
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


@router.get("/sessions/{s_id}/events", response_model=List[EventOut])
def get_session_events(s_id: int, db: Session = Depends(get_db)):
    """
    Step 8 (View Logs): Fetches all cheating logs for a specific session to prove the AI worked.
    Returns the logs ordered by the exact time they happened.
    """
    # Query the events table, filter by the session ID, and sort by timestamp
    events = (
        db.query(Event)
        .filter(Event.session_id == s_id)
        .order_by(Event.timestamp.asc())
        .all()
    )
    
    # FastAPI will automatically pass this list of raw database rows through the 
    # EventOut schema, formatting it perfectly for the frontend dashboard!
    return events