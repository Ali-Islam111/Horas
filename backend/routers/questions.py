from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Union, Any


from core.database import get_db
from core.dependencies import get_current_user, get_current_teacher
from core import crud
from schemas.questions import QuestionCreate, QuestionResponse, QuestionTeacherResponse

router = APIRouter(
    prefix="/questions",
    tags=["Questions"],
)

@router.post("/{exam_id}", response_model=QuestionTeacherResponse, status_code=status.HTTP_201_CREATED)
def add_question(
    exam_id: int,
    question: QuestionCreate,
    db: Session = Depends(get_db),
    current_teacher = Depends(get_current_teacher)
):
    """Teacher only: Add a question to an exam."""
    exam = crud.get_exam_by_id(db, exam_id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.teacher_id != current_teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this exam")
    
    return crud.create_question(db, question=question, exam_id=exam_id)

@router.get("/{exam_id}", response_model=List[Any])

def get_exam_questions(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all questions for an exam.
    - Teachers see correct choices.
    - Students only see questions and choices.
    """
    questions = crud.get_exam_questions(db, exam_id=exam_id)
    
    if current_user.role == "teacher":
        # Teachers get everything including correct_choice
        return [QuestionTeacherResponse.model_validate(q) for q in questions]
    
    # Students get questions WITHOUT correct_choice
    return [QuestionResponse.model_validate(q) for q in questions]




