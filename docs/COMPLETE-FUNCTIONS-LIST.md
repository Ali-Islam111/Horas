# 📋 Complete Functions List - Horas AI Proctoring System

> **Last Updated**: April 5, 2026
> **Total Functions**: 200+

This document provides a comprehensive list of all functions across the Horas AI Proctoring Platform, organized by module and service.

---

## Table of Contents

1. [Backend API Routers](#backend-api-routers)
2. [Backend Core & CRUD](#backend-core--crud)
3. [Backend Services](#backend-services)
4. [AI Engine Core](#ai-engine-core)
5. [AI Detectors](#ai-detectors)
6. [Frontend React Components](#frontend-react-components)
7. [Frontend Services & Controllers](#frontend-services--controllers)
8. [Mobile App Functions](#mobile-app-functions)

---

## Backend API Routers

### Authentication Router (`backend/routers/auth.py`)
- **`register()`** - Register a new user account with email, password, and role
- **`login()`** - Login with email/password, returns JWT Bearer token
- **`google_login()`** - Step 1: Redirect user to Google's login page
- **`google_callback()`** - Step 2: Handle Google OAuth callback, create/fetch user, issue JWT
- **`token()`** - Alias for /login (OAuth2 standard for Swagger Authorize button)

### Exam Router (`backend/routers/exam.py`)
- **`create_exam()`** - Teacher only: Create a new exam with questions
- **`get_my_exams()`** - Teacher only: Get exams created by current teacher
- **`get_all_exams()`** - Authenticated users: Get list of all exams
- **`get_exam()`** - Get specific exam metadata by ID
- **`delete_exam()`** - Teacher only: Delete an exam

### Session Router (`backend/routers/session.py`)
- **`enroll_exam()`** - Student: Enroll in an exam and start a session
- **`submit_exam()`** - Student: Submit answers and calculate score
- **`get_my_submissions()`** - Student: Get all their exam submissions
- **`get_all_submissions()`** - Teacher: Get all student submissions and sessions
- **`get_session_events()`** - Fetch all proctoring events for a specific session
- **`get_ai_status()`** - Check AI readiness status for a session (reconnection fallback)

### Questions Router (`backend/routers/questions.py`)
- **`add_question()`** - Teacher only: Add a question to an exam
- **`get_exam_questions()`** - Get all questions for an exam (hidden correct choice for students)

### Events Router (`backend/routers/events.py`)
- **`log_event()`** - AI Engine calls this when detecting anomalies (receives proctoring events)

### Users Router (`backend/routers/users.py`)
- **`get_all_users()`** - Get all users (protected, requires Bearer token)
- **`get_me()`** - Get currently authenticated user's profile
- **`get_user_by_id()`** - Get specific user by ID (protected)

---

## Backend Core & CRUD

### Database (`backend/core/database.py`)
- **`get_db()`** - Database session dependency for FastAPI routes
- **`create_tables()`** - Create database tables on startup

### Security (`backend/core/security.py`)
- **`hash_password()`** - Hash a plaintext password using bcrypt
- **`verify_password()`** - Verify plaintext against hashed password
- **`create_token()`** - Create JWT token with user email

### Dependencies (`backend/core/dependencies.py`)
- **`get_current_user()`** - Dependency: get authenticated user from JWT token
- **`get_current_teacher()`** - Dependency: ensure current user is a teacher
- **`get_current_student()`** - Dependency: ensure current user is a student

### Exam CRUD (`backend/core/crud/exam.py`)
- **`create_exam()`** - Create single exam in database
- **`create_exam_with_questions()`** - Batch create exam with questions in transaction
- **`get_exams()`** - Retrieve all exams with pagination
- **`get_exam_by_id()`** - Get exam by ID
- **`delete_exam()`** - Delete exam from database

### Question CRUD (`backend/core/crud/question.py`)
- **`create_question()`** - Add question to an exam
- **`get_exam_questions()`** - Get all questions for an exam

### Session CRUD (`backend/core/crud/session.py`)
- **`create_session()`** - Create new exam session for student
- **`get_session_by_id()`** - Get session by ID
- **`get_active_session()`** - Get in-progress session for user/exam combo
- **`get_student_submissions()`** - Get all sessions for a student
- **`get_all_submissions()`** - Get all sessions (ordered by date)
- **`get_session_by_user_and_exam()`** - Get session for specific user/exam pair

### User CRUD (`backend/core/crud/user.py`)
- **`get_user_by_email()`** - Look up user by email
- **`get_user_by_id()`** - Look up user by ID
- **`get_all_users()`** - Retrieve all users
- **`create_user()`** - Register new user in database

---

## Backend Services

### Exam Scoring (`backend/services/exam_scoring.py`)
- **`ScoringEngine.calculate_score()`** - Calculate score based on correct answers and question points

### Proctoring Manager (`backend/services/proctoring_manager.py`)
- **`ProctoringManager.get_ai_status()`** - Returns AI readiness status for session ("waiting", "initializing", "ready", "failed")

---

## AI Engine Core

### Core Module (`backend/AI_engine/core.py`)
- **`set_alert_hook()`** - Register alert callback function (backwards-compat for main.py)
- **`play_alert()`** - Trigger alert with source, type, and severity
- **`AlertHook.register()`** - Register per-session alert callback
- **`AlertHook.fire()`** - Fire alert callback with parameters
- **`AttentionScore.penalize()`** - Reduce attention score
- **`AttentionScore.recover()`** - Increase attention score
- **`AttentionScore.tick()`** - Record attention score, return alert if below threshold

### Main Loop (`backend/AI_engine/main.py`)
- **`_draw_hud()`** - Draw heads-up display with metrics on frame
- **`_enrollment()`** - Enroll student face for identity verification
- **`run()`** - Main proctoring loop (starts event logger, detectors, processes frames)

### Proctoring Session (`backend/AI_engine/proctoring_session.py`)
- **`ProctoringSession.__init__()`** - Initialize proctoring session for one student
- **`ProctoringSession.start()`** - Start non-blocking background thread
- **`ProctoringSession.stop()`** - Stop session and cleanup
- **`ProctoringSession.get_status()`** - Get current detector status snapshot
- **`_retrain_in_background()`** - Lazy import trainer and retrain models after session
- **`_get_roi()`** - Extract region of interest from frame with padding

---

## AI Detectors

### Head Pose Detector (`backend/AI_engine/detectors/head_pose.py`)
- **`HeadPoseDetector.__init__()`** - Initialize with camera matrix and calibration state
- **`HeadPoseDetector.calibrate_tick()`** - Collect calibration frames for head pose baseline
- **`HeadPoseDetector.process()`** - Process landmarks, compute yaw/pitch/roll angles
- **`HeadPoseDetector.draw_axes()`** - Render 3D orientation gizmo on frame
- **`HeadPoseDetector._solve()`** - Solve PnP to get rotation/translation
- **`HeadPoseDetector._rotation_matrix_to_euler()`** - Convert rotation matrix to Euler angles

### Face Signals Detector (`backend/AI_engine/detectors/face_signals.py`)
- **`GazeDetector.__init__()`** - Initialize gaze detector with iris tracking
- **`GazeDetector.calibrate_tick()`** - Collect calibration for personal gaze zone
- **`GazeDetector.process()`** - Compute horizontal/vertical iris position and direction
- **`LipMovementDetector.process()`** - Detect lip movement via Lip Aspect Ratio (LAR)
- **`GlowDetector.process()`** - Detect screen glow/phone light reflections
- **`BlinkDetector.process()`** - Detect blink events

### Anomaly Detector (`backend/AI_engine/detectors/anomaly.py`)
- **`build_vector()`** - Assemble feature vector from detector outputs
- **`IForestDetector.__init__()`** - Initialize Isolation Forest detector
- **`IForestDetector.update()`** - Add vector to buffer, train model if ready
- **`IForestDetector._train()`** - Train IForest model on buffered vectors
- **`IForestDetector._try_load_pretrained()`** - Load pre-trained IForest model
- **`LSTMAutoencoder.__init__()`** - Initialize LSTM autoencoder
- **`LSTMAutoencoder.update()`** - Add to buffer, train if ready
- **`_try_import_sklearn()`** - Lazy import scikit-learn
- **`_try_import_tf()`** - Lazy import TensorFlow

### Object Detector (YOLO) (`backend/AI_engine/detectors/object_detector.py`)
- **`ObjectDetector.__init__()`** - Initialize YOLO detector with lazy model loading
- **`ObjectDetector.start()`** - Start background thread, load model (non-blocking)
- **`ObjectDetector.stop()`** - Stop detector and cleanup
- **`ObjectDetector.enqueue()`** - Queue frame for detection
- **`ObjectDetector._load_model()`** - Load YOLO model on background thread
- **`ObjectDetector._run()`** - Background thread main loop

### Audio Detector (`backend/AI_engine/detectors/audio.py`)
- **`_rms()`** - Compute RMS energy (volume) of audio buffer
- **`_ensure_whisper()`** - Lazy load faster-whisper speech recognition model
- **`_ensure_yamnet()`** - Lazy load YAMNet audio event classifier
- **`SpeechTranscriber.transcribe()`** - Transcribe audio chunk to text
- **`MicMonitor.__init__()`** - Initialize microphone monitoring
- **`MicMonitor.tick()`** - Collect audio chunk, analyze volume/speech/events

### Identity Verifier (`backend/AI_engine/detectors/identity.py`)
- **`IdentityVerifier.__init__()`** - Initialize identity verification
- **`IdentityVerifier.enroll()`** - Capture enrollment frames, compute ArcFace embedding
- **`IdentityVerifier.verify()`** - Verify current frame against enrollment embedding

### Dataset Collector (`backend/AI_engine/detectors/dataset_collector.py`)
- **`DatasetCollector.__init__()`** - Initialize dataset snapshot collector
- **`DatasetCollector.tick()`** - Collect frame snapshot based on interval/alerts
- **`DatasetCollector._write_loop()`** - Background thread that writes snapshots to disk
- **`_yolo_label()`** - Map detected object to dataset category
- **`_serialisable()`** - Make detector state JSON-serializable

### LLM Verifier (`backend/AI_engine/detectors/llm_verifier.py`)
- **`_encode_frame_to_b64()`** - Encode image to base64 for API
- **`_call_gemini_with_fallback()`** - Call Gemini API with model fallback strategy

### Offline Trainer (`backend/AI_engine/offline_trainer.py`)
- **`_extract_vector()`** - Extract feature vector from detector metadata
- **`load_dataset()`** - Load snapshot dataset from disk by category
- **`train_iforest()`** - Train Isolation Forest on normal/alert data
- **`train_lstm()`** - Train LSTM autoencoder on normal sequences
- **`dataset_stats()`** - Print dataset statistics

### PDF Report Generator (`backend/AI_engine/reports/pdf_report.py`)
- **`generate()`** - Generate full session PDF evidence report
- **`_hex()`** - Convert hex color to ReportLab color
- **`_parse_transcript()`** - Extract transcript from audio event details
- **`_sparkline()`** - Create unicode sparkline from score history

---

## Frontend React Components

### Located in: `frontend/src/components/`

#### Authentication Components
- **`Login()`** - User login UI with role/email/password fields
- **`CreateAccount()`** - Registration page with form validation

#### Student Components
- **`StudentDashboard()`** - Student's exam list and results view
- **`StudentExam()`** - Take exam interface with timer and navigation
- **`ExamSubmission()`** - Show score/grade after submission with feedback

#### Teacher Components
- **`ExaminerDashboard()`** - Teacher's dashboard with analytics and statistics
- **`ExamCreation()`** - Create and add questions to new exam
- **`ExaminerExam()`** - Manage exam as teacher (view details, edit, delete)
- **`ExaminerStudents()`** - View student submissions and performance as teacher
- **`ExaminerAlerts()`** - View proctoring alerts and anomalies for sessions

#### Proctoring Components
- **`ProctoringMonitor()`** - Real-time view of student proctoring status
- **`AIInitializingScreen()`** - Show AI initialization status and progress

#### General Components
- **`ExamReportScreen()`** - View detailed session report with events and evidence
- **`CookieBanner()`** - Cookie consent banner at bottom of page
- **`LandingPage()`** - Home/landing page with intro and navigation
- **`GoogleCallback()`** - Handle Google OAuth redirect and session setup

---

## Frontend Services & Controllers

### Auth Controller (`frontend/src/controllers/useAuthController.js`)
- **`useAuthController()`** - Manage login/registration state and actions
- **`handleLogin()`** - Execute login with email/password verification
- **`handleRegister()`** - Execute user registration with validation
- **`handleRoleChange()`** - Switch between student/instructor role

### Exam Controller (`frontend/src/controllers/useExamController.js`)
- **`useExamController()`** - Manage exam state for both teachers/students
- **`loadExams()`** - Load all exams or user's exams based on role
- **`handleCreateExam()`** - Create exam with batch questions
- **`handleDeleteExam()`** - Delete exam from system
- **`handleEnrollExam()`** - Enroll student in exam session
- **`handleSelectExam()`** - Load exam details for preview
- **`handleAnswerChange()`** - Update student answer during exam
- **`handleSubmitExam()`** - Submit exam and get calculated score
- **`handleLoadSubmissions()`** - Load student's past submissions history

### Auth Service (`frontend/src/services/authService.js`)
- **`AuthService.login()`** - POST /auth/login - Authenticate user
- **`AuthService.register()`** - POST /auth/register - Create new account
- **`AuthService.getProfile()`** - GET /api/users/me - Get current user profile
- **`AuthService.setSession()`** - Store token and role in localStorage
- **`AuthService.getSession()`** - Retrieve stored session from localStorage

### Exam Service (`frontend/src/services/examService.js`)
- **`examService.parseExamFile()`** - Parse exam file via external AI parser
- **`examService.createExam()`** - POST /api/exams/ - Create exam
- **`examService.getMyExams()`** - GET /api/exams/my-exams - Get teacher's exams
- **`examService.getAllExams()`** - GET /api/exams/ - Get all available exams
- **`examService.getExamById()`** - GET /api/exams/{id} - Get exam details
- **`examService.deleteExam()`** - DELETE /api/exams/{id} - Delete exam
- **`examService.addQuestion()`** - POST /api/questions/{exam_id} - Add question
- **`examService.getExamQuestions()`** - GET /api/questions/{exam_id} - Get questions
- **`examService.formatParsedQuestions()`** - Format parsed questions for API

### Session Service (`frontend/src/services/sessionService.js`)
- **`sessionService.enrollExam()`** - POST /api/sessions/enroll/{exam_id} - Start exam
- **`sessionService.submitExam()`** - POST /api/sessions/{id}/submit - Submit answers
- **`sessionService.getMySubmissions()`** - GET /api/sessions/my-submissions - Get history
- **`sessionService.getAIStatus()`** - GET /api/sessions/{id}/ai-status - Check AI status

### Proctoring Service (`frontend/src/services/proctoringService.js`)
- **`connectProctoringWS()`** - Open WebSocket to AI proctoring backend
- **`sendFrame()`** - Send video frame over WebSocket for analysis
- **`close()`** - Close WebSocket connection gracefully

### Routing Utils (`frontend/src/utils/routeMapping.js`)
- **`getPageFromURL()`** - Parse current page from URL query parameters
- **`updateURLFromPage()`** - Update URL with current page navigation
- **`getInitialPage()`** - Determine initial page on app load
- **`savePageToSession()`** - Persist page in session storage

### Language Context (`frontend/src/contexts/LanguageContext.jsx`)
- **`LanguageProvider()`** - Provide i18n context to components
- **`useLanguage()`** - Hook to access language/translation functions

---

## Mobile App Functions

### Located in: `frontend/mobile app/lib/`

### Main (`main.dart`)
- **`main()`** - App entry point and initialization
- **`MyApp.build()`** - Build main MaterialApp root widget

### Models (`models/models.dart`)
- **`User.fromJson()`** - Parse user data from JSON response
- **`Exam.fromJson()`** - Parse exam from JSON
- **`Question.fromJson()`** - Parse question from JSON response
- **`MonitoringData.fromJson()`** - Parse monitoring session data
- **`ExamSubmission.fromJson()`** - Parse submission results from JSON

### API Service (`services/api_service.dart`)
- **`ApiService()`** - Singleton API client instance
- **`uploadFrame()`** - POST frame for AI analysis
- **`uploadAudio()`** - POST audio chunk for speech/event analysis
- **`storeMonitoringData()`** - Store monitoring session data on backend
- **`getMonitoringData()`** - Retrieve monitoring data for student
- **`login()`** - Mock login function (development)
- **`getExams()`** - Mock get exams list
- **`getExamDetails()`** - Mock get exam details
- **`submitExam()`** - Mock submit exam with answers
- **`createExam()`** - Mock create exam function
- **`dispose()`** - Cleanup HTTP client resources

### Student Dashboard (`screens/student_dashboard_screen.dart`)
- **`StudentDashboardScreen.initState()`** - Load exams on screen initialization
- **`_loadExams()`** - Fetch exams from API backend
- **`_startTimer()`** - Start countdown timer display
- **`_formatTime()`** - Format duration as HH:MM:SS string
- **`build()`** - Build dashboard UI layout
- **`_buildExamRulesCard()`** - Build exam rules display card
- **`_buildRuleItem()`** - Build individual rule widget
- **`_buildExamCard()`** - Build exam list item with info

### Student Exam (`screens/student_exam_screen.dart`)
- **`StudentExamScreen.initState()`** - Initialize exam timer on screen load
- **`dispose()`** - Cleanup timer resources
- **`_startTimer()`** - Start exam countdown timer
- **`_formatTime()`** - Format remaining exam time
- **`_submitExam()`** - Submit exam answers to backend
- **`build()`** - Build exam taking UI interface

### Login Screen (`screens/login_screen.dart`)
- **`LoginScreen.initState()`** - Initialize login screen state
- **`dispose()`** - Cleanup resources
- **`build()`** - Build login UI with role selection
- **`_RoleButton.build()`** - Build role selection button widget

### Create Account Screen (`screens/create_account_screen.dart`)
- **`CreateAccountScreen.dispose()`** - Cleanup text controllers
- **`build()`** - Build registration form UI
- **`_buildInputDecoration()`** - Build text field styling

### Examiner Dashboard (`screens/examiner_dashboard_screen.dart`)
- **`ExaminerDashboardScreen.initState()`** - Load teacher exams on init
- **`build()`** - Build teacher dashboard UI
- **`_buildStatCard()`** - Build statistics card widget
- **`_buildPerformanceChart()`** - Build performance line chart visualization
- **`_buildExamCard()`** - Build exam item for teacher view

### Exam Creation (`screens/exam_creation_screen.dart`)
- **`ExamCreationScreen.dispose()`** - Cleanup text controllers
- **`_addQuestion()`** - Add new question to exam
- **`build()`** - Build exam creation form UI
- **`_buildSectionTitle()`** - Build section header widget
- **`_buildQuestionCard()`** - Build question editor card
- **`_buildInputDecoration()`** - Build text field styling

### Proctoring Monitor (`screens/proctoring_monitor_screen.dart`)
- **`ProctoringMonitorScreen.initState()`** - Start auto-refresh timer on load
- **`dispose()`** - Cleanup timer resources
- **`_startAutoRefresh()`** - Poll for monitoring updates periodically
- **`build()`** - Build monitoring dashboard UI
- **`_buildStatCard()`** - Build stat card widget
- **`_buildStudentsView()`** - Build student list view
- **`_buildAlertsView()`** - Build alerts list view

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Backend Routers** | 23 |
| **Backend Core/CRUD** | 25 |
| **Backend Services** | 2 |
| **AI Engine Core** | 11 |
| **AI Detectors** | 45+ |
| **Frontend Components** | 16 |
| **Frontend Services/Controllers** | 35+ |
| **Mobile App Screens** | 50+ |
| **TOTAL** | **200+** |

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│               Horas AI Proctoring Platform                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Web Client  │  │ Mobile App   │  │  Teacher UI  │       │
│  │  (React)     │  │  (Flutter)   │  │  (React)     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│         ┌──────────────────▼──────────────────┐             │
│         │   FastAPI Backend (main.py)         │             │
│         ├─────────────────────────────────────┤             │
│         │ • Authentication & Authorization    │             │
│         │ • Exam Management                   │             │
│         │ • Session & Scoring                 │             │
│         │ • WebSocket Events API              │             │
│         └──────────────────┬──────────────────┘             │
│                            │                                │
│         ┌──────────────────▼──────────────────┐             │
│         │   AI Engine (Proctoring)            │             │
│         ├─────────────────────────────────────┤             │
│         │ • Head Pose Detection               │             │
│         │ • Gaze & Attention Tracking         │             │
│         │ • Object Detection (YOLO)           │             │
│         │ • Audio Analysis (Speech, Music)    │             │
│         │ • Identity Verification (ArcFace)   │             │
│         │ • Anomaly Detection (IForest, LSTM) │             │
│         │ • Evidence Collection               │             │
│         └──────────────────┬──────────────────┘             │
│                            │                                │
│         ┌──────────────────▼──────────────────┐             │
│         │   Database (PostgreSQL/SQLite)      │             │
│         ├─────────────────────────────────────┤             │
│         │ • Users, Exams, Questions           │             │
│         │ • Sessions, Submissions, Events     │             │
│         │ • Proctoring Evidence               │             │
│         └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## How to Use This Document

1. **Find a specific function**: Use Ctrl+F to search for function name
2. **Understand module structure**: Each section represents a distinct service
3. **Trace API flow**: Follow from router → service → CRUD → database
4. **AI Engine flow**: Detectors → Anomaly detection → Events API → Frontend
5. **Mobile/Web parity**: Both apps use same backend API endpoints

---

**Project**: Horas AI Proctoring System
**Version**: 1.0.0
**Status**: Active Development
