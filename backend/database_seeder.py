import os
import bcrypt  # <-- Added bcrypt to generate real hashes
from datetime import datetime, timezone

from core.database import SessionLocal, engine, Base
from models.user import User
from models.exam import Exam
from models.questions import Question  # Matches your file name 'questions.py'
from models.session import Session
from models.events import Event

def seed_database():
    print("⏳ Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if data already exists to prevent duplicates on multiple runs
        if db.query(User).first():
            print("⚠️ Database already contains data. Skipping seed to prevent duplicates.")
            print("🛑 IF YOU ARE TRYING TO FIX DATA, DELETE YOUR .DB FILE FIRST!")
            return

        print("🌱 Seeding Users...")
        
        # FIX: Generate a real bcrypt hash for the dummy password "password123"
        dummy_password = "password123"
        salt = bcrypt.gensalt()
        real_hashed_password = bcrypt.hashpw(dummy_password.encode('utf-8'), salt).decode('utf-8')

        # 1. Create a default admin/proctor (This will act as our Teacher)
        admin_user = User(
            full_name="Admin Proctor",
            email="admin@system.com",
            password_hash=real_hashed_password,  # <-- Uses the real hash now
            role="admin"
        )
        
        # 2. Create the Test Student
        test_student = User(
            full_name="Ahmed Hassan",  
            email="student@system.com",
            password_hash=real_hashed_password,  # <-- Uses the real hash now
            role="student"
        )
        
        db.add_all([admin_user, test_student])
        db.commit()
        db.refresh(admin_user)
        db.refresh(test_student)

        print("📝 Seeding Exam and Questions...")
        # 3. Create a sample exam
        # FIX: Added the required 'teacher_id' field, linking it to our admin_user
        sample_exam = Exam(
            title="Introduction to Data Structures",
            description="A foundational exam covering basic data structures like stacks, queues, and trees.",
            access_code="DEMO123", 
            duration_minutes=120,
            teacher_id=admin_user.id  # <-- Newly added field!
        )
        db.add(sample_exam)
        db.commit()
        db.refresh(sample_exam)

        # 4. Add sample questions to the exam
        # FIX: Changed choice to a LIST and correct_choice to match a string in the list
        q1 = Question(
            exam_id=sample_exam.id,
            question_text="Explain the time complexity of QuickSort.",
            question_type="multiple_choice",
            choice=["O(1)", "O(n)", "O(n log n)", "O(n^2)"],
            correct_choice="O(n log n)"
        )
        
        # FIX: Changed choice to a LIST and correct_choice to match a string in the list
        q2 = Question(
            exam_id=sample_exam.id,
            question_text="Which data structure uses LIFO?",
            question_type="multiple_choice",
            choice=["Queue", "Stack", "Tree", "Graph"],
            correct_choice="Stack"
        )
        
        db.add_all([q1, q2])
        db.commit()

        print("🎥 Seeding Active Exam Session...")
        # 5. Create the Active Session for our WebSocket test (Session ID = 1)
        active_session = Session(
            user_id=test_student.id,
            exam_id=sample_exam.id,
            status="in_progress",
            student_answers={},
            started_at=datetime.now(timezone.utc)
        )
        db.add(active_session)
        db.commit()
        db.refresh(active_session)

        print("=====================================================")
        print("✅ Database successfully seeded with initial test data!")
        print("🔑 LOGIN CREDENTIALS:")
        print(f"   Admin: admin@system.com / {dummy_password}")
        print(f"   Student: student@system.com / {dummy_password}")
        print("-----------------------------------------------------")
        print(f"👉 Use Session ID: {active_session.id} for your WebSocket tests.")
        print(f"👉 Student Name: {test_student.full_name}")
        print(f"👉 Teacher Name: {admin_user.full_name}")
        print("=====================================================")

    except Exception as e:
        db.rollback()
        print(f"❌ An error occurred while seeding the database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()