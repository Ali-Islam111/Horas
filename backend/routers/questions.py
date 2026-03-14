from fastapi import APIRouter

router = APIRouter(
    prefix="/questions",
    tags=["Questions"],
)

@router.get("/")
def get_questions():
    return {"message": "Questions endpoint"}
