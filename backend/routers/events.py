from fastapi import APIRouter

router = APIRouter(
    prefix="/events",
    tags=["Events"],
)

@router.get("/")
def get_events():
    return {"message": "Events endpoint"}
