import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from core.config import settings

# If DATABASE_URL is a relative sqlite path, make it absolute relative to this file's directory
# This ensures the database.db is always created inside the backend/ folder, regardless of where
# the server is launched from.
database_url = settings.DATABASE_URL
if database_url.startswith("sqlite:///./"):
    db_filename = database_url.replace("sqlite:///./", "")
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", db_filename)
    db_path = os.path.normpath(db_path)
    database_url = f"sqlite:///{db_path}"

engine = create_engine(database_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Provide a database session and ensure it's closed after each request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables based on models when the application starts."""
    Base.metadata.create_all(bind=engine)