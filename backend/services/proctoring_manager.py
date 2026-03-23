import asyncio
import requests
import sys
import os
from fastapi import WebSocket

# Import our database tools to fetch the real student!
from core.database import SessionLocal
from models.session import Session as ExamSession  # Aliased so it doesn't clash with SQLAlchemy's Session

# ─── THE ULTIMATE NAMESPACE HACK ───────────────────────────────────────
# We must resolve the collision between backend/core/ and AI_engine/core.py

# 1. Temporarily hide the backend's 'core' module from Python's memory
backend_core = sys.modules.pop('core', None)

# 2. Force the AI Engine to the VERY TOP of Python's search list (index 0)
ai_engine_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "AI_engine")
sys.path.insert(0, ai_engine_path)

# 3. Import the AI Session (Python will now safely grab AI_engine/core.py)
from proctoring_session import ProctoringSession

# 4. Clean up! Remove the AI path and restore the backend's core
sys.path.pop(0)
if backend_core:
    sys.modules['core'] = backend_core
# ───────────────────────────────────────────────────────────────────────


class ProctoringManager:
    def __init__(self):
        self.active_sessions = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        """
        Triggered by routers/streaming.py when a student connects.
        Bootstraps the AI session and wires up the callbacks.
        """
        loop = asyncio.get_running_loop()

        def handle_alert(alert_data):
            """THE MICROSERVICE BRIDGE (Runs on background thread)"""
            payload = {
                "session_id": int(session_id),
                "timestamp": alert_data["timestamp"],
                "category": alert_data["source"],
                "description": alert_data["event_type"],
                "details": alert_data["details"],
                "evidence_url": alert_data.get("screenshot", "")
            }

            try:
                api_url = "http://127.0.0.1:8000/api/events/log"
                response = requests.post(api_url, json=payload)
                response.raise_for_status() 
            except Exception as e:
                print(f"[Manager] Failed to send REST API alert to database: {e}")

            warning_msg = {
                "type": "alert", 
                "category": alert_data["source"],
                "message": alert_data["event_type"]
            }
            asyncio.run_coroutine_threadsafe(websocket.send_json(warning_msg), loop)

        # ─── FETCH THE REAL STUDENT FROM THE DATABASE ──────────────────────────
        # Open a quick, temporary database connection
        db = SessionLocal()
        try:
            # Query the session table and use the relationship you built to access the user!
            db_session = db.query(ExamSession).filter(ExamSession.id == int(session_id)).first()
            
            if db_session and db_session.user:
                real_student_id = f"S-{db_session.user.id}"
                real_student_name = db_session.user.full_name
            else:
                # Safe fallbacks just in case something weird happens during testing
                real_student_id = f"Unknown_{session_id}"
                real_student_name = "Unknown Student"
        finally:
            db.close() # Always close the connection to free up memory

        # ─── Initialize the AI Session with REAL Data ──────────────────────────
        ai_session = ProctoringSession(
            student_id=real_student_id, 
            student_name=real_student_name, 
            session_id=session_id,
            on_alert=handle_alert
        )
        
        ai_session.start()

        self.active_sessions[session_id] = {
            "ai_session": ai_session,
            "ws": websocket
        }
        print(f"[Manager] ✅ Session {session_id} AI Proctoring Started for {real_student_name}.")

    async def process_frame(self, session_id: str, frame_bytes: bytes):
        if session_id in self.active_sessions:
            ai_session = self.active_sessions[session_id]["ai_session"]
            ai_session.push_frame(frame_bytes)

    def disconnect(self, session_id: str):
        if session_id in self.active_sessions:
            ai_session = self.active_sessions[session_id]["ai_session"]
            
            print(f"[Manager] 🛑 Stopping Session {session_id}. Generating PDF...")
            report = ai_session.stop() 
            print(f"[Manager] 📄 PDF Report generated at: {report.get('pdf_path')}")
            
            del self.active_sessions[session_id]

manager = ProctoringManager()