from typing import List, Dict
from models.questions import Question

class ScoringEngine:
    @staticmethod
    def _normalize_to_letter(value, choices=None):
        if value is None:
            return None

        text = str(value).strip()
        if not text:
            return None

        upper = text.upper()

        # Direct letter form: A / B / C / D
        if upper in {"A", "B", "C", "D"}:
            return upper

        # Common formatted forms: "A)", "A.", "A -", "A:"
        if upper[0] in {"A", "B", "C", "D"} and (len(upper) == 1 or upper[1] in {")", ".", ":", "-", " "}):
            return upper[0]

        # Text form: map option text back to its letter (supports legacy stored answers)
        if isinstance(choices, list):
            normalized_text = text.strip().lower()
            for idx, option in enumerate(choices):
                if normalized_text == str(option).strip().lower():
                    return chr(65 + idx)

        return None

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
            choices = q.choice if isinstance(q.choice, list) else []

            student_answer = ScoringEngine._normalize_to_letter(student_raw_answer, choices)
            correct_answer = ScoringEngine._normalize_to_letter(q.correct_choice, choices)

            if student_answer and correct_answer and student_answer == correct_answer:
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
