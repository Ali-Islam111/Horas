from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from core.config import settings

engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base= declarative_base()

# access a db session and ensure there's no multiple sessions open at the same time.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
    
# when application is first run, create tables based on the models and put them in the database.     
def create_tables():
    Base.metadata.create_all(bind=engine)