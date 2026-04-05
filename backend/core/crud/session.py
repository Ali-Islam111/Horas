from sqlalchemy.orm import Session
from sqlalchemy.orm import load_only, joinedload
from typing import List, Optional
from models.session import Session as ExamSession
from schemas.session import SessionCreate
from models.exam import Exam
from sqlalchemy import nullslast

def create_session(db: Session, session_in: SessionCreate):
    db_session = ExamSession(
        user_id=session_in.user_id,
        exam_id=session_in.exam_id,
        status="in_progress"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_session_by_id(db: Session, session_id: int):
    return db.query(ExamSession).filter(ExamSession.id == session_id).first()

def get_active_session(db: Session, user_id: int, exam_id: int):
    return db.query(ExamSession).filter(
        ExamSession.user_id == user_id,
        ExamSession.exam_id == exam_id,
        ExamSession.status == "in_progress"
    ).first()

def get_student_submissions(db: Session, user_id: int):
    return db.query(ExamSession).filter(ExamSession.user_id == user_id).all()

def get_all_submissions(db: Session, teacher_id: int):
    return (
        db.query(ExamSession)
        .join(ExamSession.exam)
        .filter(Exam.teacher_id == teacher_id)
        .order_by(ExamSession.started_at.desc())
        .all()
    )

def get_session_by_user_and_exam(db: Session, user_id: int, exam_id: int):
    return db.query(ExamSession).filter(
        ExamSession.user_id == user_id,
        ExamSession.exam_id == exam_id
    ).first()

def update_session_report_path(db: Session, session_id: int, file_path: str):
    """Called by the Proctoring Manager after the AI session ends to persist the PDF path"""
    db_session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if db_session:
        db_session.report_path = file_path
        db.commit()
        db.refresh(db_session)
    return db_session

def get_student_reports_for_teacher(db: Session, student_id: int, teacher_id: int, skip: int = 0, limit: int = 20):
    """
    Returns all completed sessions for a given student, but only
    for exams that belong to the requesting teacher. Filters to
    sessions that have an actual report generated (report_path is not null).
    """
    return (
        db.query(ExamSession)
        .options(
            # Query Optimization so we don't look up the whole session instance (we don't need the answers).
            load_only(
                ExamSession.id,
                ExamSession.exam_id,
                ExamSession.user_id,
                ExamSession.status,
                ExamSession.final_score,
                ExamSession.submitted_at,
                ExamSession.report_path,
            ),
            joinedload(ExamSession.exam)                        # Use the Exam relationship to load the exam data in the same query and avoid a N+1 problem.
        )
        .join(ExamSession.exam)                                 # JOIN exams table
        .filter(ExamSession.user_id == student_id)              # this student only
        .filter(Exam.teacher_id == teacher_id)                  # teacher's exams only
        .filter(ExamSession.report_path.isnot(None))            # must have a report    
        .order_by(nullslast(ExamSession.submitted_at.desc()))   # Ensure Null values are always displayed at last.
        .offset(skip).limit(limit)
        .all()
    )

def get_my_reports(db: Session, student_id: int, skip: int = 0, limit: int = 20):
    """
    Returns all sessions for the student that have a generated report.
    """
    return (
        db.query(ExamSession)
        .options(
            load_only(
                ExamSession.id,
                ExamSession.exam_id,
                ExamSession.user_id,
                ExamSession.status,
                ExamSession.final_score,
                ExamSession.submitted_at,
                ExamSession.report_path,
            ),
            joinedload(ExamSession.exam)                            # ← exam data comes free in the JOIN
        )
        .filter(ExamSession.user_id == student_id)                  # this student only
        .filter(ExamSession.report_path.isnot(None))                # must have a report
        .order_by(nullslast(ExamSession.submitted_at.desc()))       # Ensure Null values are always displayed at last.
        .offset(skip).limit(limit)
        .all()
    )