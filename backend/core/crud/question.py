from sqlalchemy.orm import Session
from typing import List
from models.questions import Question
from schemas.questions import QuestionCreate

def create_question(db: Session, question: QuestionCreate, exam_id: int):
    db_question = Question(
        **question.model_dump(),
        exam_id=exam_id
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def get_exam_questions(db: Session, exam_id: int):
    return db.query(Question).filter(Question.exam_id == exam_id).all()
