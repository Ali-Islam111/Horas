from fastapi import APIRouter

router = APIRouter(
    prefix="/ws",
    tags=["Live Streaming & WebSockets"],
)

@router.get("/")
def get_streaming():
    return {"message": "Streaming endpoint"}
