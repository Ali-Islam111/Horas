from typing import List, Dict
from models.questions import Question

class ScoringEngine:
    @staticmethod
    def calculate_score(questions: List[Question], student_answers: Dict[str, str]) -> Dict:
        """
        Calculates the score based on correct answers and question points.
        Returns a dictionary with raw score, percentage, and counts.
        """
        total_points = sum(q.points for q in questions)
        earned_points = 0
        correct_count = 0
        
        if total_points == 0:
            return {
                "earned_points": 0,
                "total_points": 0,
                "score_percentage": 0.0,
                "correct_count": 0,
                "total_questions": len(questions)
            }

        for q in questions:
            # Map question ID from integer to string as student_answers comes from JSON (string keys)
            student_raw_answer = student_answers.get(str(q.id))
            
            if not student_raw_answer or not q.correct_choice:
                continue

            student_answer = str(student_raw_answer).strip().upper()
            correct_answer = str(q.correct_choice).strip().upper()

            if student_answer == correct_answer:
                earned_points += q.points
                correct_count += 1
        
        score_percentage = (earned_points / total_points) * 100
        
        return {
            "earned_points": earned_points,
            "total_points": total_points,
            "score_percentage": round(float(score_percentage), 2),
            "correct_count": correct_count,
            "total_questions": len(questions)
        }
