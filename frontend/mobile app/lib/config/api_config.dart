class ApiConfig {
  // Update this URL to your backend server
  static const String baseUrl = 'http://localhost:5000';
  
  // API Endpoints
  static const String uploadFrame = '/upload_frame';
  static const String uploadAudio = '/upload_audio';
  static const String storeMonitoringData = '/store_monitoring_data';
  static const String getMonitoringData = '/get_monitoring_data';
  
  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
