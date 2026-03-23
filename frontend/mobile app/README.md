# AI Proctor Mobile App

A Flutter mobile application for AI-powered exam proctoring with real-time monitoring capabilities.

## 📱 Features

### For Students
- **Login & Authentication** - Secure login with student credentials
- **Dashboard** - View upcoming and completed exams
- **Exam Interface** - Take exams with real-time monitoring
- **Camera Integration** - Automatic face detection during exams
- **Timer** - Live countdown for exam duration
- **Question Navigation** - Easy navigation between questions

### For Instructors/Examiners
- **Examiner Dashboard** - Overview of all exams and statistics
- **Exam Creation** - Create exams with multiple questions
- **Real-time Monitoring** - Monitor all active students during exams
- **Alert System** - Get notified of suspicious activities
- **Performance Analytics** - View student performance charts
- **Student Management** - Track student status and alerts

### AI Proctoring Features
- Face detection and recognition
- Gaze tracking
- Phone/unauthorized object detection
- Multiple person detection
- Audio analysis for suspicious sounds
- Real-time alerts to examiners

## 🛠️ Technologies Used

- **Flutter** - Cross-platform mobile development
- **Dart** - Programming language
- **Camera Plugin** - For video capture and monitoring
- **FL Chart** - For performance analytics
- **HTTP/Dio** - API communication
- **Provider** - State management

## 📦 Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2
  google_fonts: ^6.1.0
  flutter_svg: ^2.0.9
  provider: ^6.1.1
  go_router: ^12.1.3
  http: ^1.1.2
  dio: ^5.4.0
  camera: ^0.10.5+5
  image_picker: ^1.0.5
  permission_handler: ^11.1.0
  record: ^5.0.4
  audioplayers: ^5.2.1
  shared_preferences: ^2.2.2
  path_provider: ^2.1.1
  intl: ^0.18.1
  uuid: ^4.2.2
  fl_chart: ^0.65.0
  video_player: ^2.8.1
  web_socket_channel: ^2.4.0
```

## 🚀 Getting Started

### Prerequisites

- Flutter SDK (3.0.0 or higher)
- Dart SDK
- Android Studio / VS Code
- Android SDK / Xcode (for iOS)

### Installation

1. **Clone the repository**
```bash
cd "mobile app"
```

2. **Install dependencies**
```bash
flutter pub get
```

3. **Configure API endpoint**
   
   Edit `lib/config/api_config.dart`:
   ```dart
   static const String baseUrl = 'http://your-backend-url:5000';
   ```

4. **Run the app**
   
   For Android:
   ```bash
   flutter run
   ```
   
   For iOS:
   ```bash
   flutter run -d ios
   ```

5. **Build APK (Android)**
   ```bash
   flutter build apk --release
   ```

6. **Build iOS App**
   ```bash
   flutter build ios --release
   ```

## 📱 Supported Platforms

- ✅ Android (6.0 and above)
- ✅ iOS (11.0 and above)

## 🔧 Configuration

### Camera Permissions

#### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

#### iOS (`ios/Runner/Info.plist`)
```xml
<key>NSCameraUsageDescription</key>
<string>Camera is required for exam proctoring</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone is required for exam proctoring</string>
```

## 📂 Project Structure

```
mobile app/
├── lib/
│   ├── main.dart                    # App entry point
│   ├── config/
│   │   └── api_config.dart         # API configuration
│   ├── models/
│   │   └── models.dart             # Data models
│   ├── services/
│   │   └── api_service.dart        # API service layer
│   ├── screens/
│   │   ├── login_screen.dart                    # Login page
│   │   ├── create_account_screen.dart           # Registration
│   │   ├── student_dashboard_screen.dart        # Student home
│   │   ├── student_exam_screen.dart             # Exam interface
│   │   ├── examiner_dashboard_screen.dart       # Examiner home
│   │   ├── exam_creation_screen.dart            # Create exams
│   │   └── proctoring_monitor_screen.dart       # Live monitoring
│   └── widgets/                     # Reusable widgets
├── assets/
│   └── images/                      # Image assets
├── pubspec.yaml                     # Dependencies
└── README.md                        # This file
```

## 🎯 Usage

### Student Flow
1. Login with student credentials
2. View upcoming exams on dashboard
3. Start exam when ready
4. Camera automatically activates for monitoring
5. Answer questions with timer running
6. Submit exam

### Examiner Flow
1. Login with instructor credentials
2. View dashboard with statistics
3. Create new exams with questions
4. Monitor active exams in real-time
5. View alerts for suspicious activities
6. Review student performance

## 🔗 Backend Integration

This app connects to the Flask backend API. Make sure to:

1. Run the backend server (see `backend/README.md`)
2. Update the API base URL in `lib/config/api_config.dart`
3. Ensure your mobile device can reach the backend server

### API Endpoints Used
- `POST /upload_frame` - Upload video frames for analysis
- `POST /upload_audio` - Upload audio for analysis
- `POST /store_monitoring_data` - Store monitoring events
- `GET /get_monitoring_data` - Retrieve monitoring data

## 🔒 Security

- Secure authentication system
- Camera access only during exams
- Encrypted data transmission
- Real-time monitoring alerts
- Session management

## 📝 Notes

- Camera permission is required for proctoring
- Microphone permission is required for audio monitoring
- Internet connection required for real-time monitoring
- Minimum Android 6.0 or iOS 11.0 required

## 🐛 Troubleshooting

### Camera not working
- Check camera permissions in device settings
- Restart the app
- Check if camera is being used by another app

### Connection issues
- Verify backend server is running
- Check API URL in `api_config.dart`
- Ensure device is connected to network
- Check firewall settings

### Build errors
```bash
flutter clean
flutter pub get
flutter run
```

## 📄 License

This project is part of the AI Proctoring System graduation project.

## 👨‍💻 Development

Built with Flutter and connected to the Python Flask backend for AI-powered proctoring capabilities.

### Main Features Implemented
✅ Authentication (Login/Register)
✅ Student Dashboard
✅ Exam Taking Interface
✅ Camera Integration
✅ Examiner Dashboard
✅ Exam Creation
✅ Real-time Monitoring
✅ Alert System
✅ Performance Charts

## 🆘 Support

For issues or questions, please refer to the main project documentation or contact the development team.
