from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.database import create_tables
from routers import auth, exam, questions, session, events, streaming

# Automatically create all database tables when the server starts.
create_tables()

app = FastAPI(
    title="Horas Demo API",
    description="The AI Proctoring Exam Platform - Student Cycle & Live Monitoring",
    version="1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS to ensure the React/Vite frontend can communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all the routers to the main app, adding prefixes and tags for the Swagger Docs
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(exam.router, prefix=settings.API_PREFIX)
app.include_router(questions.router, prefix=settings.API_PREFIX)
app.include_router(session.router, prefix=settings.API_PREFIX)
app.include_router(events.router, prefix=settings.API_PREFIX)

# Note: Streaming usually doesn't have a global prefix here because WebSockets 
# define their own full paths (e.g., /ws/sessions/{id}) inside the router itself.
app.include_router(streaming.router, tags=["Live Streaming & WebSockets"])

# A simple health check route to verify the server is alive
@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "message": "Welcome to the Horas Demo API. Navigate to /docs for the interactive API reference."
    }

if __name__ == "__main__":
    import uvicorn
    # reload=True automatically restarts the server when you save a file
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)