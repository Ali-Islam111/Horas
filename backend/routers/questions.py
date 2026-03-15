from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Union

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

@router.get("/{exam_id}", response_model=List[Union[QuestionTeacherResponse, QuestionResponse]])
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
    
    # Pydantic Union will pick the first one that matches perfectly.
    # We return the list, and FastAPI/Pydantic will handle the serialization 
    # based on the union members. Since students' objects won't be filtered 
    # automatically, we should be explicit or ensure the first union member 
    # doesn't match if we are a student.
    
    # A cleaner way is to use different response models per branch, but FastAPI 
    # response_model is static. So we must ensure the data returned matches 
    # the desired schema.
    
    if current_user.role == "teacher":
        return questions
    
    # For students, we return the same list but the Union will use QuestionResponse 
    # if it doesn't find the teacher-specific fields in the returned object? 
    # No, the DB object HAS all fields. 
    # To be safe, we cast them to QuestionResponse which strips the extra field.
    return [QuestionResponse.model_validate(q) for q in questions]


