from fastapi import APIRouter

router = APIRouter(
    prefix="/session",
    tags=["Session"],
)

@router.get("/")
def get_session():
    return {"message": "Session endpoint"}
