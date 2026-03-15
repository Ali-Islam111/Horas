import os
import sys

# Ensures 'core', 'models', 'routers' are found regardless of run directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from core.database import create_tables
from core.config import settings

# Register all models with SQLAlchemy before create_tables()
from models import user, exam, questions, session, events

# Routers
from routers.auth import router as auth_router, token_router
from routers.users import router as users_router
from routers import exam as r_exam, questions as r_questions
from routers import session as r_session, events as r_events, streaming

# Create DB tables on startup
create_tables()

app = FastAPI(
    title="Horas Demo API",
    description="The AI Proctoring Exam Platform - Student Cycle & Live Monitoring",
    version="1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Required by Authlib to store OAuth2 state between the Google redirect and callback
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# ── Auth & Users (public + protected) ──────────────────────────────────
app.include_router(token_router)                          # POST /token  (Swagger OAuth2)

app.include_router(auth_router, prefix=settings.API_PREFIX)   # POST /api/auth/register
                                                               # POST /api/auth/login

app.include_router(users_router, prefix=settings.API_PREFIX)  # GET  /api/users/
                                                               # GET  /api/users/me
                                                               # GET  /api/users/{id}

# ── Other prefixed routes ───────────────────────────────────────────────
app.include_router(r_exam.router, prefix=settings.API_PREFIX)
app.include_router(r_questions.router, prefix=settings.API_PREFIX)
app.include_router(r_session.router, prefix=settings.API_PREFIX)
app.include_router(r_events.router, prefix=settings.API_PREFIX)
app.include_router(streaming.router, tags=["Live Streaming & WebSockets"])

@app.get("/", tags=["Health"])
def root():
    return {"status": "online", "message": "Horas Demo API is running. Visit /docs for the full API reference."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    # uvicorn main:app --reload --app-dir backend