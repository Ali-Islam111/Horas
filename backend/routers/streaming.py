from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.proctoring_manager import manager 

router = APIRouter(
    prefix="/ws",
    tags=["Live Streaming & WebSockets"]
)

@router.websocket("/sessions/{s_id}")
async def proctoring_stream(websocket: WebSocket, s_id: int):
    """
    Step 5 (Simultaneous AI): The WebSocket endpoint that stays open for the entire exam.
    The frontend sends video frames here, and the backend sends alerts back.
    """
    # 1. Accept the incoming "phone call" from the student's browser
    await websocket.accept()
    
    # We convert s_id to a string because dictionary keys in Python are often easier to manage as strings
    session_id_str = str(s_id)

    # 2. Tell our manager that a new student has joined.
    # We pass the actual 'websocket' object so the manager can use it to send warnings back!
    await manager.connect(session_id_str, websocket)

    try:
        # 3. The Infinite Loop
        while True:
            # Wait to receive a video frame from the frontend (usually as binary bytes)
            frame_bytes = await websocket.receive_bytes()
            
            # Immediately hand the frame over to the AI engine's queue
            await manager.process_frame(session_id_str, frame_bytes)
            
    except WebSocketDisconnect:
        # 4. The Disconnect
        # This block triggers automatically if the student clicks "Submit", closes their tab, 
        # or loses their Wi-Fi connection.
        print(f"WebSocket disconnected for session {session_id_str}")
        manager.disconnect(session_id_str)