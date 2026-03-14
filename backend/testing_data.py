# This script is for filling all the database models (user, exam, session, questions, events) with dummy data to speed up testing the project instead of filling the database manually.

# Below is an example to demonstrate the functionality of this script:
"""
# testing_data.py
from backend.core.database import SessionLocal
from backend.models.user import User
from backend.models.exam import Exam
from backend.models.questions import Question

def seed_database():
    # Open a database session
    db = SessionLocal()
    
    try:
        # 1. Create a default admin/proctor
        admin_user = User(
            username="admin_proctor",
            email="admin@system.com",
            hashed_password="hashed_password_here",
            is_active=True,
            role="admin"
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user) # Refresh to get the generated ID

        # 2. Create a sample exam linked to the admin
        sample_exam = Exam(
            title="Introduction to Data Structures",
            duration_minutes=120,
            proctor_id=admin_user.id,
            is_active=True
        )
        db.add(sample_exam)
        db.commit()
        db.refresh(sample_exam)

        # 3. Add sample questions to the exam
        q1 = Question(
            exam_id=sample_exam.id,
            question_text="Explain the time complexity of QuickSort.",
            question_type="essay",
            points=10
        )
        q2 = Question(
            exam_id=sample_exam.id,
            question_text="Which data structure uses LIFO?",
            question_type="multiple_choice",
            points=5
        )
        
        db.add_all([q1, q2])
        db.commit()

        print("Database successfully seeded with initial test data!")

    except Exception as e:
        db.rollback()
        print(f"An error occurred while seeding the database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting database seed...")
    seed_database()
"""