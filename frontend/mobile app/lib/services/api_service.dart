import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/models.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final http.Client _client = http.Client();

  // Upload video frame for analysis
  Future<Map<String, dynamic>> uploadFrame(File imageFile) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.uploadFrame}');
      final request = http.MultipartRequest('POST', uri);
      
      request.files.add(
        await http.MultipartFile.fromPath('frame', imageFile.path),
      );

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to upload frame: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error uploading frame: $e');
    }
  }

  // Upload audio for analysis
  Future<Map<String, dynamic>> uploadAudio(File audioFile) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.uploadAudio}');
      final request = http.MultipartRequest('POST', uri);
      
      request.files.add(
        await http.MultipartFile.fromPath('audio', audioFile.path),
      );

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to upload audio: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error uploading audio: $e');
    }
  }

  // Store monitoring data
  Future<bool> storeMonitoringData(MonitoringData data) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.storeMonitoringData}');
      final response = await _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: json.encode(data.toJson()),
      ).timeout(ApiConfig.connectionTimeout);

      return response.statusCode == 200;
    } catch (e) {
      throw Exception('Error storing monitoring data: $e');
    }
  }

  // Get monitoring data for a student
  Future<List<MonitoringData>> getMonitoringData(String studentId) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.getMonitoringData}?student_id=$studentId');
      final response = await _client.get(uri).timeout(ApiConfig.receiveTimeout);

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = json.decode(response.body);
        return jsonList.map((json) => MonitoringData.fromJson(json)).toList();
      } else {
        throw Exception('Failed to get monitoring data: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting monitoring data: $e');
    }
  }

  // Mock API calls for development (remove when backend is ready)
  Future<User> login(String email, String password, String role) async {
    // Simulate API call
    await Future.delayed(const Duration(seconds: 1));
    
    return User(
      id: 'user_${DateTime.now().millisecondsSinceEpoch}',
      email: email,
      name: 'Ibrahim Mohamed',
      role: role,
    );
  }

  Future<List<Exam>> getExams(String userId, String role) async {
    // Simulate API call
    await Future.delayed(const Duration(seconds: 1));
    
    return [
      Exam(
        id: 'exam_1',
        title: 'Mathematics Final Exam',
        description: 'Comprehensive mathematics final examination',
        startTime: DateTime.now().add(const Duration(hours: 2)),
        endTime: DateTime.now().add(const Duration(hours: 4)),
        duration: 120,
        status: 'upcoming',
        questions: [],
      ),
      Exam(
        id: 'exam_2',
        title: 'Physics Midterm',
        description: 'Physics midterm examination',
        startTime: DateTime.now().subtract(const Duration(days: 2)),
        endTime: DateTime.now().subtract(const Duration(days: 2, hours: -2)),
        duration: 90,
        status: 'completed',
        questions: [],
      ),
    ];
  }

  Future<Exam> getExamDetails(String examId) async {
    // Simulate API call
    await Future.delayed(const Duration(seconds: 1));
    
    return Exam(
      id: examId,
      title: 'Mathematics Final Exam',
      description: 'Comprehensive mathematics final examination',
      startTime: DateTime.now(),
      endTime: DateTime.now().add(const Duration(hours: 2)),
      duration: 120,
      status: 'active',
      questions: [
        Question(
          id: 'q1',
          text: 'What is the derivative of x²?',
          type: 'multiple_choice',
          options: ['2x', 'x', '2', 'x²'],
          correctAnswer: '2x',
          points: 10,
        ),
        Question(
          id: 'q2',
          text: 'Is the integral of 1/x equal to ln(x)?',
          type: 'true_false',
          options: ['True', 'False'],
          correctAnswer: 'True',
          points: 5,
        ),
      ],
    );
  }

  Future<bool> submitExam(ExamSubmission submission) async {
    // Simulate API call
    await Future.delayed(const Duration(seconds: 1));
    return true;
  }

  Future<Exam> createExam(Exam exam) async {
    // Simulate API call
    await Future.delayed(const Duration(seconds: 1));
    return exam;
  }

  void dispose() {
    _client.close();
  }
}
