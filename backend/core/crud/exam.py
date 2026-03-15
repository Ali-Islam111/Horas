from sqlalchemy.orm import Session
from typing import List
from models.exam import Exam
from schemas.exam import ExamCreate

def create_exam(db: Session, exam: ExamCreate, teacher_id: int):
    db_exam = Exam(
        **exam.model_dump(),
        teacher_id=teacher_id
    )
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

def get_exams(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Exam).offset(skip).limit(limit).all()

def get_exam_by_id(db: Session, exam_id: int):
    return db.query(Exam).filter(Exam.id == exam_id).first()

def delete_exam(db: Session, exam_id: int):
    db_exam = get_exam_by_id(db, exam_id)
    if db_exam:
        db.delete(db_exam)
        db.commit()
        return True
    return False
