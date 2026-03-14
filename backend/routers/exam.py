from fastapi import APIRouter

router = APIRouter(
    prefix="/exam",
    tags=["Exam"],
)

@router.get("/")
def get_exam():
    return {"message": "Exam endpoint"}
