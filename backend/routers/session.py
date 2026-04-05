import os
from AI_engine import config as ai_config
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from core.database import get_db
from core.dependencies import get_current_user, get_current_student, get_current_teacher
from core import crud
from schemas.session import SessionCreate, SessionResponse, StudentAnswerSubmit, SubmissionResult, AIStatusResponse, ReportListItem
from services.exam_scoring import ScoringEngine
from services.proctoring_manager import manager

from models.events import Event
from schemas.events import EventOut

REPORTS_DIR = os.path.realpath(ai_config.REPORTS_DIR)

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

    # Reject submission if the AI never confirmed ready
    if session_record.ai_ready_at is None:
        raise HTTPException(
            status_code=400,
            detail="Cannot submit — AI proctoring has not finished initializing yet."
        )

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

@router.get("/all-submissions", response_model=List[SessionResponse])
def get_all_submissions(
    db: Session = Depends(get_db),
    current_teacher = Depends(get_current_teacher)
):
    """Teacher only: Get all student submissions and sessions."""
    return crud.get_all_submissions(db, teacher_id=current_teacher.id)

@router.get("/{session_id}/events", response_model=List[EventOut])
def get_session_events(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher = Depends(get_current_teacher)
):
    """
    Step 8 (View Logs): Fetches all cheating logs for a specific session to prove the AI worked.
    Returns the logs ordered by the exact time they happened.
    """
    db_session = crud.get_session_by_id(db, session_id=session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.exam.teacher_id != current_teacher.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Query the events table, filter by the session ID, and sort by timestamp
    events = (
        db.query(Event)
        .filter(Event.session_id == session_id)
        .order_by(Event.timestamp.asc())
        .all()
    )
    
    # FastAPI will automatically pass this list of raw database rows through the 
    # EventOut schema, formatting it perfectly for the frontend dashboard!
    return events


@router.get("/{session_id}/ai-status", response_model=AIStatusResponse)
def get_ai_status(
    session_id: int,
    current_user = Depends(get_current_user)
):
    """
    Reconnection fallback: check the AI readiness status for a session.
    Returns 'waiting', 'initializing', 'ready', or 'failed'.
    """
    status = manager.get_ai_status(str(session_id))
    return {"session_id": session_id, "status": status}

@router.get("/my-reports", response_model=List[ReportListItem])
def get_my_reports(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_student = Depends(get_current_student)
):
    """
    Student Only: Get all sessions where a proctoring report was generated.

    must be defined before `/{session_id}/report` in the file, because 
    a literal path segment must beat a dynamic one.
    """
    return crud.get_my_reports(db, student_id=current_student.id, skip=skip, limit=limit)

@router.get("/{session_id}/report")
def download_session_report(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Teacher or Student: Stream the proctoring PDF for a given session.
    - Teachers may only access reports for sessions belonging to their own exams.
    - Students may only access their own session's report.
    """
    db_session = crud.get_session_by_id(db, session_id=session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Ownership check
    if current_user.role == "student" and db_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "teacher" and db_session.exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if not db_session.report_path:
        raise HTTPException(status_code=404, detail="Report has not been generated yet for this session")

    if not os.path.exists(db_session.report_path):
        raise HTTPException(status_code=404, detail="Report file is missing from the server filesystem")
    
    # Resolve symlinks and normalize the path before trusting it
    # Validate the path actually leads to session_reports/ 
    resolved = os.path.realpath(db_session.report_path)
    if not resolved.startswith(REPORTS_DIR):
        raise HTTPException(status_code=403, detail="Invalid report path")

    filename = os.path.basename(db_session.report_path)
    return FileResponse(
        path=resolved,
        media_type="application/pdf",
        filename=filename,
        # cache for 1 hour so we don't download the same file every request, user-private means only the requesting browser caches it.
        headers={"Cache-Control": "private, max-age=3600"}  
    )

@router.get("/reports/student/{user_id}", response_model=List[ReportListItem])
def get_student_reports(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_teacher = Depends(get_current_teacher)
):
    """
    Teacher Only: get all sessions with reports for a specific studnet,
    filtered to only this teacher's own exams.
    """
    return crud.get_student_reports_for_teacher(
        db,
        student_id=user_id,
        teacher_id=current_teacher.id,
        skip=skip,
        limit=limit
    )