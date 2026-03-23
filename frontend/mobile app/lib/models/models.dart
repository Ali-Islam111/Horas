class User {
  final String id;
  final String email;
  final String name;
  final String role; // 'student' or 'instructor'

  User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      role: json['role'] ?? 'student',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
    };
  }
}

class Exam {
  final String id;
  final String title;
  final String description;
  final DateTime startTime;
  final DateTime endTime;
  final int duration; // in minutes
  final String status; // 'upcoming', 'active', 'completed'
  final List<Question> questions;

  Exam({
    required this.id,
    required this.title,
    required this.description,
    required this.startTime,
    required this.endTime,
    required this.duration,
    required this.status,
    required this.questions,
  });

  factory Exam.fromJson(Map<String, dynamic> json) {
    return Exam(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      startTime: DateTime.parse(json['start_time'] ?? DateTime.now().toIso8601String()),
      endTime: DateTime.parse(json['end_time'] ?? DateTime.now().toIso8601String()),
      duration: json['duration'] ?? 60,
      status: json['status'] ?? 'upcoming',
      questions: (json['questions'] as List?)
          ?.map((q) => Question.fromJson(q))
          .toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'start_time': startTime.toIso8601String(),
      'end_time': endTime.toIso8601String(),
      'duration': duration,
      'status': status,
      'questions': questions.map((q) => q.toJson()).toList(),
    };
  }
}

class Question {
  final String id;
  final String text;
  final String type; // 'multiple_choice', 'true_false', 'essay'
  final List<String> options;
  final String? correctAnswer;
  final int points;

  Question({
    required this.id,
    required this.text,
    required this.type,
    required this.options,
    this.correctAnswer,
    required this.points,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'] ?? '',
      text: json['text'] ?? '',
      type: json['type'] ?? 'multiple_choice',
      options: List<String>.from(json['options'] ?? []),
      correctAnswer: json['correct_answer'],
      points: json['points'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'type': type,
      'options': options,
      'correct_answer': correctAnswer,
      'points': points,
    };
  }
}

class MonitoringData {
  final String studentId;
  final DateTime timestamp;
  final Map<String, dynamic> videoAnalysis;
  final Map<String, dynamic> audioAnalysis;
  final String? alertType;
  final String? alertMessage;

  MonitoringData({
    required this.studentId,
    required this.timestamp,
    required this.videoAnalysis,
    required this.audioAnalysis,
    this.alertType,
    this.alertMessage,
  });

  factory MonitoringData.fromJson(Map<String, dynamic> json) {
    return MonitoringData(
      studentId: json['student_id'] ?? '',
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      videoAnalysis: json['video_analysis'] ?? {},
      audioAnalysis: json['audio_analysis'] ?? {},
      alertType: json['alert_type'],
      alertMessage: json['alert_message'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'student_id': studentId,
      'timestamp': timestamp.toIso8601String(),
      'video_analysis': videoAnalysis,
      'audio_analysis': audioAnalysis,
      'alert_type': alertType,
      'alert_message': alertMessage,
    };
  }
}

class ExamSubmission {
  final String examId;
  final String studentId;
  final Map<String, String> answers; // questionId -> answer
  final DateTime submissionTime;
  final int score;

  ExamSubmission({
    required this.examId,
    required this.studentId,
    required this.answers,
    required this.submissionTime,
    required this.score,
  });

  factory ExamSubmission.fromJson(Map<String, dynamic> json) {
    return ExamSubmission(
      examId: json['exam_id'] ?? '',
      studentId: json['student_id'] ?? '',
      answers: Map<String, String>.from(json['answers'] ?? {}),
      submissionTime: DateTime.parse(json['submission_time'] ?? DateTime.now().toIso8601String()),
      score: json['score'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'exam_id': examId,
      'student_id': studentId,
      'answers': answers,
      'submission_time': submissionTime.toIso8601String(),
      'score': score,
    };
  }
}
