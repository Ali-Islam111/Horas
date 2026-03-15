from sqlalchemy.orm import Session
from typing import List, Optional
from models.session import Session as ExamSession
from schemas.session import SessionCreate

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

def get_session_by_user_and_exam(db: Session, user_id: int, exam_id: int):
    return db.query(ExamSession).filter(
        ExamSession.user_id == user_id,
        ExamSession.exam_id == exam_id
    ).first()


