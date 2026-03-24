from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from core.database import get_db
from core.dependencies import get_current_user, get_current_student
from core import crud
from schemas.session import SessionCreate, SessionResponse, StudentAnswerSubmit, SubmissionResult
from services.exam_scoring import ScoringEngine

from models.events import Event
from schemas.events import EventOut


router = APIRouter(
    prefix="/sessions",
    tags=["Sessions"],
)

@router.post("/enroll/{exam_id}", response_model=SessionResponse)
def enroll_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_student = Depends(get_current_student)
):
    """Student only: Enroll in an exam and start a session."""
    # Check if exam exists
    exam = crud.get_exam_by_id(db, exam_id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check if student already has an active or completed session for this exam
    existing_session = crud.get_session_by_user_and_exam(db, user_id=current_student.id, exam_id=exam_id)

    
    if existing_session:
        return existing_session

    session_in = SessionCreate(user_id=current_student.id, exam_id=exam_id)
    return crud.create_session(db, session_in=session_in)




@router.post("/{session_id}/submit", response_model=SubmissionResult)
def submit_exam(
    session_id: int,
    submission: StudentAnswerSubmit,
    db: Session = Depends(get_db),
    current_student = Depends(get_current_student)
):
    """Student only: Submit choices and calculate score."""
    session_record = crud.get_session_by_id(db, session_id=session_id)
    if not session_record:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session_record.user_id != current_student.id:
        raise HTTPException(status_code=403, detail="Not authorized to submit this session")
    
    if session_record.status == "completed":
        raise HTTPException(status_code=400, detail="Exam already submitted")

    # Fetch questions to grade
    questions = crud.get_exam_questions(db, exam_id=session_record.exam_id)
    if not questions:
        raise HTTPException(status_code=400, detail="Exam has no questions")

    # Use the Scoring Engine
    result = ScoringEngine.calculate_score(questions, submission.answers)
    
    # Update session record
    session_record.student_answers = submission.answers
    session_record.final_score = result["score_percentage"]
    session_record.status = "completed"
    session_record.submitted_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(session_record)
    
    return {
        "message": "Exam submitted successfully",
        "score": result["score_percentage"],
        "total_questions": result["total_questions"]
    }


@router.get("/my-submissions", response_model=List[SessionResponse])
def get_my_submissions(
    db: Session = Depends(get_db),
    current_student = Depends(get_current_student)
):
    """Student only: Get all their own exam submissions."""
    return crud.get_student_submissions(db, user_id=current_student.id)



@router.get("/{s_id}/events", response_model=List[EventOut])
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