import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from core.dependencies import get_current_user, get_current_teacher
from core import crud
from schemas.exam import ExamCreate, ExamCreateBatch, ExamResponse
from services.exam_parser import parse_exam, ParsedExamResult

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


# ─────────────────────────────────────────────────────────────────────────────
#  File size cap: 10 MB. Protects server from oversized uploads.
# ─────────────────────────────────────────────────────────────────────────────
_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}


@router.post("/parse", response_model=ParsedExamResult)
async def parse_exam_file(
    file: UploadFile = File(...),
    current_teacher=Depends(get_current_teacher),
):
    """
    Teacher only: Upload a PDF or DOCX exam file.
    Extracts MCQ questions, choices, and bold-detected correct answers.
    Returns a structured JSON list of questions (1 mark each).
    Nothing is written to the database.
    """
    # ── 1. File type validation (before touching disk) ────────────────────────
    filename = file.filename or ""
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename detected. Please upload a valid PDF or DOCX file.",
        )
    ext = os.path.splitext(filename)[1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{ext}'. Please upload a PDF or DOCX file.",
        )

    # ── 2. Read bytes, enforce empty-file & size cap ──────────────────────────
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty. Please upload a valid PDF or DOCX file.",
        )
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 10 MB size limit. Please upload a smaller document.",
        )

    # ── 3. Write to temp file (delete=False required on Windows) ─────────────
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # ── 4. Run parser ─────────────────────────────────────────────────────
        result = parse_exam(tmp_path)
        return result

    except HTTPException:
        # Re-raise FastAPI exceptions untouched (prevents catch-all from swallowing them)
        raise
    except FileNotFoundError:
        # Should not happen in normal flow — temp file was just written
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A server error occurred while processing the file. Please try again.",
        )
    except ValueError as exc:
        # Hard format errors raised by the parser (no questions found, bad type)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except ImportError as exc:
        # Missing library (fitz / python-docx not installed on server)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server configuration error: {exc}",
        )
    except Exception as exc:
        # Catch-all for unexpected parser failures
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while parsing the file: {exc}",
        )
    finally:
        # ── 5. Guaranteed temp file cleanup ───────────────────────────────────
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

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

