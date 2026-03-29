from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from core.dependencies import get_current_user, get_current_teacher
from core import crud
from schemas.exam import ExamCreate, ExamCreateBatch, ExamResponse

router = APIRouter(
    prefix="/exams",
    tags=["Exams"],
)

@router.post("/", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    exam: ExamCreateBatch, 
    db: Session = Depends(get_db),
    current_teacher = Depends(get_current_teacher)
):
    """Teacher only: Create a new exam."""
    # Check if access code is unique
    existing_exam = db.query(crud.Exam).filter(crud.Exam.access_code == exam.access_code).first()
    if existing_exam:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An exam with this access code already exists."
        )
    return crud.create_exam_with_questions(db=db, exam_data=exam, teacher_id=current_teacher.id)

@router.get("/my-exams", response_model=List[ExamResponse])
def get_my_exams(
    db: Session = Depends(get_db),
    current_teacher = Depends(get_current_teacher)
):
    """Teacher only: Get exams created by the current teacher."""
    return db.query(crud.Exam).filter(crud.Exam.teacher_id == current_teacher.id).all()


@router.get("/", response_model=List[ExamResponse])
def get_all_exams(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Authenticated users: Get list of all exams."""
    return crud.get_exams(db=db)

@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam(
    exam_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Authenticated users: Get a specific exam's metadata."""
    exam = crud.get_exam_by_id(db, exam_id=exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    return exam

@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_teacher = Depends(get_current_teacher)
):
    """Teacher only: Delete an exam."""
    exam = crud.get_exam_by_id(db, exam_id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Optional: Check if the teacher owns the exam
    if exam.teacher_id != current_teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this exam."
        )
        
    crud.delete_exam(db, exam_id=exam_id)
    return None

