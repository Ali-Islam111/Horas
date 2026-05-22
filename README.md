<div align="center">

# 🎓 Horas — AI-Powered Online Exam Proctoring System

**A full-stack, real-time proctoring platform built for the modern academic environment.**
*Graduation Project — Faculty of Computers & Artificial Intelligence*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 🎬 Demo

> **Watch the full system demo below:**

<https://github.com/user-attachments/assets/03e6ac3d-3382-4d4c-a3e0-de62965296a3>

> *If the video does not play inline, [click here to download the demo](./docs/Project-demo.mp4).*
---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Key Features](#-key-features)
3. [Tech Stack](#-tech-stack)
4. [System Architecture](#-system-architecture)
5. [Database ERD](#-database-erd)
6. [Installation](#%EF%B8%8F-installation)
7. [Configuration](#-configuration-environment-variables)
8. [Running the System](#-running-the-system)
9. [API Reference](#-api-reference)
10. [Project Structure](#-project-structure)
11. [Future Roadmap](#%EF%B8%8F-future-roadmap)
12. [Team & Acknowledgements](#-team--acknowledgements)

---

## 🧭 Overview

**Horas** is an intelligent, real-time online exam proctoring system designed to uphold academic integrity without requiring physical invigilation. It combines a **FastAPI** backend, a **React** frontend, and a dedicated **AI Engine** that analyzes live webcam feeds using computer vision models to detect and log suspicious behavior during exams.

The name *Horas* derives from the Arabic word for "guardian" — the system acts as a silent, impartial invigilator, ensuring fair assessments regardless of geography.

---

## ✨ Key Features

- 🔐 **JWT + Google OAuth2 Authentication** — Secure, dual-mode login supporting both traditional credentials and Google Sign-In.
- 🎭 **Role-Based Access Control** — Distinct `student`, `teacher`, and `admin` roles with guarded API routes.
- 📝 **Full Exam Lifecycle Management** — Teachers create exams with MCQ questions; students enroll and submit via access code.
- 📊 **Automatic Scoring Engine** — Weighted point-per-question grading with configurable total/passing marks.
- 👁️ **Real-Time AI Proctoring** — Live video frames streamed over WebSocket to an AI pipeline that detects:
  - Gaze deviation & head pose anomalies
  - Foreign object detection via YOLO (phones, books)
  - Behavioral anomaly detection (IForest / LSTM)
- 🚦 **AI Readiness Gate** — Exam submission is *blocked* until the AI engine confirms it is calibrated and ready.
- 📄 **PDF Proctoring Reports** — Auto-generated after each session with a full event log; securely downloadable by teacher or student.
- 📡 **Structured Event Logging** — Every AI anomaly is persisted to the DB with timestamp, category, description, and evidence screenshot path.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | FastAPI (Python 3.10+) |
| **Frontend** | React 18 |
| **AI / ML Engine** | PyTorch, MediaPipe, Ultralytics YOLO, DeepFace / ArcFace |
| **Anomaly Detection** | Isolation Forest, LSTM (custom-trained) |
| **Database ORM** | SQLAlchemy + SQLite (dev) / PostgreSQL (prod-ready) |
| **Data Validation** | Pydantic v2 |
| **Authentication** | JWT (python-jose), Google OAuth2 (Authlib) |
| **Real-Time Transport** | WebSockets (FastAPI native) |
| **Report Generation** | ReportLab (PDF) |
| **Dev Tools** | Uvicorn, python-dotenv |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Horas AI Proctoring Platform                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐              ┌──────────────────────┐   │
│  │   Student UI    │              │     Teacher UI       │   │
│  │   (React)       │              │     (React)          │   │
│  └────────┬────────┘              └──────────┬───────────┘   │
│           │  REST + WebSocket          REST  │               │
│           └───────────────┬──────────────────┘               │
│                           │                                  │
│          ┌────────────────▼─────────────────────┐            │
│          │        FastAPI Backend               │            │
│          │  ┌───────────────────────────────┐   │            │
│          │  │  Routers (auth/exam/session/  │   │            │
│          │  │  questions/events/users/ws)   │   │            │
│          │  └──────────────┬────────────────┘   │            │
│          │                 │                    │            │
│          │  ┌──────────────▼───────────────┐    │            │
│          │  │  Services Layer              │    │            │
│          │  │  • ProctoringManager         │    │            │
│          │  │  • ScoringEngine             │    │            │
│          │  │  • ReportGenerator           │    │            │
│          │  └──────────────┬───────────────┘    │            │
│          │                 │                    │            │
│          │  ┌──────────────▼───────────────┐    │            │
│          │  │  SQLAlchemy ORM → SQLite/PG  │    │            │
│          │  └──────────────────────────────┘    │            │
│          └──────────────────────────────────────┘            │
│                           │ WebSocket frames                 │
│          ┌────────────────▼─────────────────────┐            │
│          │          AI Engine (Python)          │            │
│          │  ┌──────────────────────────────┐    │            │
│          │  │  • Head Pose Estimation      │    │            │
│          │  │  • Gaze Tracking             │    │            │
│          │  │  • YOLO Object Detection     │    │            │
│          │  │  • Anomaly Detection         │    │            │
│          │  │    (IForest / LSTM)          │    │            │
│          │  └──────────────────────────────┘    │            │
│          │  Logs events → POST /api/events/log  │            │
│          └──────────────────────────────────────┘            │
│                                                              │
│  ┌──────────────────────────────────────────────────┐        │
│  │  Mobile App (Flutter)  ← Planned / Future        │        │
│  └──────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database ERD

Reverse-engineered directly from the SQLAlchemy models.

![Database Entity Relationship Diagram](./docs/Exam%20Session%20Interaction.png)

### Relationship Summary

| Relationship | Cardinality | Cascade |
|---|---|---|
| User → Exams | One-to-Many (teacher creates exams) | — |
| User → Sessions | One-to-Many (student takes exams) | — |
| Exam → Questions | One-to-Many | `delete-orphan` |
| Exam → Sessions | One-to-Many | `delete-orphan` |
| Session → Events | One-to-Many | `delete-orphan` |

---

## ⚙️ Installation

### Prerequisites (required for both methods)

- Python 3.10+
- Node.js 18+ & npm
- Git

### ⚡ Option A — One-Click Setup (Recommended for Windows)

1. Download only the `project_setup.bat` script and place it where you want to install the project.
2. Right-click `project_setup.bat` → **Run as Administrator**.
3. The script will automatically:
   - Create a Python virtual environment
   - Install all backend dependencies (`requirements.txt`)
   - Install all frontend dependencies (`npm install`)
   - Verify GPU availability for the AI engine

### 🔧 Option B — Manual Setup

> [!CAUTION]
> Dependencies **must** be installed in the exact order below to prevent binary conflicts between PyTorch, MediaPipe, and Whisper.

**Step 1: Clone the repository**

```bash
git clone https://github.com/Ali-Islam111/Horas-Demo.git
cd "Horas"
```

**Step 2: Create and activate a virtual environment**

```bash
# Windows (use the Python Launcher to pin the exact version)
py -3.10 -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -3.10 -m venv venv
source venv/bin/activate
```

**Step 3 — Install GPU-Accelerated PyTorch**

Install the **CUDA 12.1** PyTorch wheels first. This ensures YOLO and DeepFace utilize the GPU instead of defaulting to slower CPU binaries.

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Step 4 — Prevent Audio Library Conflicts**

`faster-whisper` will break if `ctranslate2` is not installed first. Lock in the correct binaries before proceeding.

```bash
pip install ctranslate2>=4.0.0
```

**Step 5 — Install Remaining Dependencies**

Once the core ML binaries are locked in, install the rest of the web server and AI dependencies.

```bash
# Run from the repository root:
pip install -r backend/requirements.txt
```

**Step 6 — Install frontend dependencies**

```bash
cd frontend
npm install
cd ..
```

---

## 🔑 Configuration (Environment Variables)

Create a `.env` file in the `backend/` directory. Use the template below:

```env
# ─── Application ─────────────────────────────────────────────
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ─── Database ────────────────────────────────────────────────
# SQLite (default for local dev):
DATABASE_URL=sqlite:///./horas.db

# PostgreSQL (production-ready alternative):
# DATABASE_URL=postgresql://user:password@localhost:5432/horas_db 

# ─── Google OAuth2 ───────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# ─── Frontend ────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
```

> **Note:** Never commit your `.env` file. It is already listed in `.gitignore`.

---

## 🚀 Running the System

### Using the Startup Script (Windows — Recommended)

1. Place `server_startup.bat` in the project root directory (same level as `backend/` and `frontend/`).
2. Right-click → **Run as Administrator**.

The script will launch the FastAPI backend, wait for it to become healthy, then start the React frontend and open your browser automatically.

### Manual Start

**Terminal 1 — Backend API Server:**

```bash
cd backend
python main.py
```

**Terminal 2 — Frontend Dev Server:**

```bash
cd frontend
npm run dev
```

| Service | URL |
|---|---|
| Backend API | <http://localhost:8000> |
| Interactive API Docs (Swagger) | <http://localhost:8000/docs> |
| Alternative API Docs (ReDoc) | <http://localhost:8000/redoc> |
| Frontend App | <http://localhost:3000> |

---

## 📡 API Reference

All REST endpoints are prefixed with `/api` (e.g. `http://localhost:8000/api/auth/login`). The WebSocket endpoint is served at the root level without this prefix.

### 🔐 Authentication  

| Method | Route | Auth Required | Role | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Any | Register a new user account |
| `POST` | `/auth/login` | ❌ | Any | Login; returns a JWT Bearer token |
| `GET` | `/auth/google` | ❌ | Any | Redirect to Google OAuth2 login page |
| `GET` | `/auth/google/callback` | ❌ | Any | Google OAuth2 callback; issues JWT & redirects to frontend |

### 👤 Users  

| Method | Route | Auth Required | Role | Description |
|---|---|---|---|---|
| `GET` | `/users/` | ✅ | Any | Get all registered users |
| `GET` | `/users/me` | ✅ | Any | Get the currently authenticated user's profile |
| `GET` | `/users/{user_id}` | ✅ | Any | Get a specific user by ID |

### 📝 Exams  

| Method | Route | Auth Required | Role | Description |
|---|---|---|---|---|
| `POST` | `/exams/` | ✅ | Teacher | Create a new exam (with questions in one batch) |
| `GET` | `/exams/my-exams` | ✅ | Teacher | Get all exams created by the authenticated teacher |
| `GET` | `/exams/` | ✅ | Any | Get a list of all available exams |
| `GET` | `/exams/{exam_id}` | ✅ | Any | Get a specific exam's full metadata |
| `DELETE` | `/exams/{exam_id}` | ✅ | Teacher | Delete an exam (owner only; cascades to sessions & questions) |

### ❓ Questions  

| Method | Route | Auth Required | Role | Description |
|---|---|---|---|---|
| `POST` | `/questions/{exam_id}` | ✅ | Teacher | Add a single question to an existing exam |
| `GET` | `/questions/{exam_id}` | ✅ | Any | Get all questions; teachers see `correct_choice`, students do not |

### 🧪 Sessions  

| Method | Route | Auth Required | Role | Description |
|---|---|---|---|---|
| `POST` | `/sessions/enroll/{exam_id}` | ✅ | Student | Enroll in an exam; creates (or returns existing) session |
| `POST` | `/sessions/{session_id}/submit` | ✅ | Student | Submit answers; triggers scoring; blocked if AI not ready |
| `GET` | `/sessions/my-submissions` | ✅ | Student | Get all of the student's own exam sessions |
| `GET` | `/sessions/all-submissions` | ✅ | Teacher | Get all student sessions for the teacher's exams |
| `GET` | `/sessions/{session_id}/events` | ✅ | Teacher | Get all proctoring event logs for a specific session |
| `GET` | `/sessions/{session_id}/ai-status` | ✅ | Any | Poll AI readiness status (`waiting`/`initializing`/`ready`/`failed`) |
| `GET` | `/sessions/my-reports` | ✅ | Student | Get all sessions with a generated proctoring PDF report |
| `GET` | `/sessions/{session_id}/report` | ✅ | Teacher/Student | Stream-download the proctoring PDF for a session |
| `GET` | `/sessions/reports/student/{user_id}` | ✅ | Teacher | Get all reports for a specific student (teacher's exams only) |

### 🚨 Proctoring Events  

| Method | Route | Auth Required | Role | Description |
|---|---|---|---|---|
| `POST` | `/events/log` | ❌* | AI Engine | Internal: AI engine POSTs a detected anomaly event to persist it |

> *The `/events/log` endpoint is called internally by the AI Engine process running server-side and does not require a user JWT in the current implementation.

### 📡 Live Streaming  (WebSocket)

> [!NOTE]
> The WebSocket router is registered **without** the `/api` prefix. Connect to `ws://localhost:8000/ws/sessions/{session_id}` directly.

| Protocol | Route | Description |
|---|---|---|
| `WS` | `ws://localhost:8000/ws/sessions/{session_id}` | Bi-directional: frontend streams raw video frames → AI engine processes and returns real-time alerts |

---

## 📁 Project Structure

```
Horas Demo V1.0/
│
├── backend/
│   ├── main.py                        # FastAPI app entrypoint — registers all routers,
│   │                                  #   CORS, SessionMiddleware, and DB creation
│   ├── requirements.txt               # Python dependency list (pip freeze)
│   ├── yolo11n.pt                     # YOLOv11-nano weights file (object detection)
│   ├── database_seeder.py             # One-off script to populate DB with test data
│   │
│   ├── core/
│   │   ├── config.py                  # Pydantic Settings — loads all .env variables
│   │   ├── database.py                # SQLAlchemy engine, SessionLocal, create_tables()
│   │   ├── security.py                # bcrypt hashing, JWT create/verify
│   │   ├── dependencies.py            # FastAPI Depends guards: get_current_user/teacher/student
│   │   └── crud/                      # All DB query helpers (users, exams, sessions, questions)
│   │        ├── user.py                    
│   │        ├── exam.py                    
│   │        ├── questions.py               
│   │        └── session.py                 
│   │
│   ├── models/                        # SQLAlchemy ORM — defines the actual DB tables
│   │   ├── user.py                    # users table
│   │   ├── exam.py                    # exams table (FK → users)
│   │   ├── questions.py               # questions table (FK → exams, stores choices as JSON)
│   │   ├── session.py                 # sessions table (FK → users + exams, stores answers as JSON)
│   │   └── events.py                  # events table (FK → sessions, AI anomaly log)
│   │
│   ├── schemas/                       # Pydantic v2 — request/response validation shapes
│   │   ├── auth.py                    # UserCreate, UserResponse, Token, TokenData
│   │   ├── exam.py                    # ExamCreate, ExamCreateBatch, ExamResponse
│   │   ├── questions.py               # QuestionCreate, QuestionResponse, QuestionTeacherResponse
│   │   ├── session.py                 # SessionCreate/Response, StudentAnswerSubmit,
│   │   │                                SubmissionResult, AIStatusResponse, ReportListItem
│   │   └── events.py                  # EventCreate, EventOut
│   │
│   ├── routers/                       # FastAPI route handler files (one per domain)
│   │   ├── auth.py                    # POST /auth/register, /auth/login, GET /auth/google*
│   │   ├── users.py                   # GET /users/, /users/me, /users/{id}
│   │   ├── exam.py                    # CRUD for /exams/ (teacher-gated creates/deletes)
│   │   ├── questions.py               # POST/GET /questions/{exam_id}
│   │   ├── session.py                 # Full session lifecycle: enroll → submit → reports
│   │   ├── events.py                  # POST /events/log (internal AI → DB bridge)
│   │   └── streaming.py               # WS /ws/sessions/{id} (live video frame pipeline)
│   │
│   ├── services/
│   │   ├── proctoring_manager.py      # WebSocket connection registry; routes frames to
│   │   │                                ProctoringSession; tracks per-session AI status
│   │   └── exam_scoring.py            # ScoringEngine.calculate_score() — weighted MCQ grading
│   │
│   └── AI_engine/                     # Self-contained CV/ML proctoring pipeline
│       ├── config.py                  # All AI tunables: thresholds, paths, model settings
│       ├── core.py                    # AlertHook, AttentionScore, play_alert() — shared primitives
│       ├── main.py                    # run() — top-level proctoring loop; draws HUD on frames
│       ├── proctoring_session.py      # ProctoringSession — per-student thread; starts/stops detectors
│       ├── offline_trainer.py         # CLI tool: trains IForest & LSTM on collected datasets
│       ├── yolo11n.pt                 # YOLO weights copy inside AI_engine
│       │
│       ├── detectors/                 # One file per detection modality
│       │   ├── head_pose.py           # HeadPoseDetector — MediaPipe + solvePnP yaw/pitch/roll
│       │   ├── face_signals.py        # GazeDetector, LipMovementDetector, GlowDetector, BlinkDetector
│       │   ├── object_detector.py     # ObjectDetector — async YOLO inference on background thread
│       │   ├── anomaly.py             # IForestDetector, LSTMAutoencoder — unsupervised anomaly scoring
│       │   ├── audio.py               # MicMonitor — volume, faster-whisper transcription, YAMNet events
│       │   ├── identity.py            # IdentityVerifier — ArcFace face enrollment + frame verification
│       │   ├── dataset_collector.py   # DatasetCollector — snapshots frames + metadata to disk for retraining
│       │   ├── llm_verifier.py        # Gemini API vision fallback for ambiguous cheating frames
│       │   └── one_euro_filter.py     # 1€ smoothing filter for noisy landmark coordinates
│       │
│       ├── reports/
│       │   └── pdf_report.py          # generate() — full PDF evidence report with sparklines & snapshots
│       │
│       ├── evidence/                  # Runtime: AI stores screenshot evidence here
│       ├── session_reports/           # Runtime: generated PDF reports stored here
│       ├── saved_models/              # Runtime: persisted IForest & LSTM model files
│       ├── dataset/                   # Runtime: DatasetCollector frame snapshots per category
│       └── reference_faces/           # Runtime: ArcFace enrollment embeddings per student
│
├── frontend/                          # React 18 + Vite web application
│   ├── index.html                     # Vite HTML entry point
│   ├── vite.config.js                 # Vite config (proxy, plugins)
│   ├── package.json                   # npm dependencies & scripts
│   ├── eslint.config.js               # ESLint rules
│   │
│   └── src/
│       ├── main.jsx                   # React DOM root mount
│       ├── App.jsx                    # Top-level router — maps URL query params to page components
│       ├── App.css / index.css        # Global styles & CSS variables
│       │
│       ├── components/                # Page-level React components (one file = one screen/page)
│       │   ├── LandingPage.jsx        # Public home page — hero, features, CTA
│       │   ├── Login.jsx              # Login form with role selector (student / teacher)
│       │   ├── CreateAccount.jsx      # Registration form with validation
│       │   ├── GoogleCallback.jsx     # Handles /auth/callback redirect from Google OAuth
│       │   ├── CookieBanner.jsx       # GDPR cookie consent banner
│       │   │
│       │   ├── StudentDashboard.jsx   # Student home — exam list, enroll, history
│       │   ├── StudentExam.jsx        # Exam-taking UI — timer, question nav, webcam feed
│       │   ├── AIInitializingScreen.jsx # Blocks exam start; polls AI readiness status
│       │   ├── ExamSubmission.jsx     # Post-submit score screen with pass/fail feedback
│       │   │
│       │   ├── ExaminerDashboard.jsx  # Teacher home — stats overview, exam list
│       │   ├── ExamCreation.jsx       # Multi-step exam builder with question editor
│       │   ├── ExaminerExam.jsx       # Teacher exam detail view — metadata, questions
│       │   ├── ExaminerStudents.jsx   # Student submission table for a teacher's exam
│       │   ├── ExaminerAlerts.jsx     # Proctoring event log viewer per session
│       │   ├── ExaminerSettings.jsx   # Teacher account & platform settings
│       │   │
│       │   ├── ProctoringMonitor.jsx  # Live WebSocket status dashboard during exam
│       │   └── ExamReportScreen.jsx   # Full PDF-style report viewer with evidence timeline
│       │
│       ├── controllers/               # Custom hooks — business logic decoupled from UI
│       │   ├── useAuthController.js   # Login/register state, role switching
│       │   └── useExamController.js   # Exam CRUD, enroll, answer, submit, submissions
│       │
│       ├── hooks/
│       │   └── useExamCreation.js     # Multi-step exam creation form state machine
│       │
│       ├── services/                  # Raw API call wrappers (fetch/axios)
│       │   ├── authService.js         # login(), register(), getProfile(), setSession()
│       │   ├── examService.js         # CRUD for exams + questions; parseExamFile() via AI
│       │   ├── sessionService.js      # enrollExam(), submitExam(), getMySubmissions(), getAIStatus()
│       │   ├── proctoringService.js   # WebSocket client: connectProctoringWS(), sendFrame(), close()
│       │   └── geminiService.js       # Client-side Gemini API integration for exam file parsing
│       │
│       ├── contexts/
│       │   └── LanguageContext.jsx    # i18n context provider; useLanguage() hook
│       │
│       ├── i18n/
│       │   └── translations.js        # AR/EN translation strings (~58 KB, full bilingual UI)
│       │
│       └── utils/
│           └── routeMapping.js        # URL ↔ page name mapping helpers
│
├── frontend/mobile app/               # Flutter mobile app (Android, iOS, Web)
│   ├── pubspec.yaml                   # Flutter dependency manifest
│   └── lib/
│       ├── main.dart                  # App entry point, MaterialApp root
│       ├── models/models.dart         # JSON-serializable data models (User, Exam, etc.)
│       ├── services/api_service.dart  # Singleton HTTP client — wraps all backend API calls
│       └── screens/                   # One file per screen
│           ├── login_screen.dart
│           ├── create_account_screen.dart
│           ├── student_dashboard_screen.dart
│           ├── student_exam_screen.dart
│           ├── examiner_dashboard_screen.dart
│           ├── exam_creation_screen.dart
│           └── proctoring_monitor_screen.dart
│
├── docs/
│   ├── COMPLETE-FUNCTIONS-LIST.md     # Granular breakdown of all 200+ internal functions
│   ├── Exam Session Interaction.png   # Database ERD diagram
│   ├── Project-demo.mp4               # Full system demonstration video
│   └── Graduuation Project Report- 2026.docx
│
├── project_setup.bat                  # One-click Windows installer (clones, venv, deps)
├── server_startup.bat                 # Launches backend + frontend + opens browser
├── Exam_Monitor_Postman_Collection.json  # Ready-to-import Postman test suite
└── README.md
```

> 📖 For a granular breakdown of all 200+ internal functions across every module, see [COMPLETE-FUNCTIONS-LIST.md](./docs/COMPLETE-FUNCTIONS-LIST.md).

---

## 🗺️ Future Roadmap

- [ ] **Mobile App** — Develop a Flutter-based cross-platform client (Android/iOS) to extend exam access beyond web browsers.
- [ ] **Dockerization** — Containerize the FastAPI backend, AI Engine, and React frontend into a single `docker-compose` stack for zero-friction deployment.
- [ ] **PostgreSQL Migration** — Transition from the local SQLite database to a managed PostgreSQL instance for production scalability and concurrent write support.
- [ ] **Admin Dashboard** — A dedicated admin panel for user management, platform-wide analytics, and system health monitoring.
- [ ] **Live Alerts to Teacher** — Push real-time proctoring alerts to the teacher's dashboard via a second WebSocket channel.
- [ ] **Question Bank** — Allow teachers to maintain a reusable pool of questions across multiple exams.

---

## 👥 Team & Acknowledgements

This project was developed as a graduation project.

| Name | Role | GitHub | LinkedIn |
|---|---|---|---|
| Ibrahim Mohammed Al-Batrawshy | Team Lead & Frontend Developer | [IbrahimAlBatrawshy](https://github.com/IbrahimAlBatrawshy) | [Ibrahim Al-Batrawshy](https://www.linkedin.com/in/ibrahimal-batrawshy/) |
| Ali Islam Taha | Backend Lead | [Ali-Islam111](https://github.com/Ali-Islam111) | [Ali Islam](https://www.linkedin.com/in/ali-islam-taha1011) |
| Mohammed Emad Mohammed | Backend Developer | [mohamedemad6244](https://github.com/mohamedemad6244) | — |
| Saif El-Dien El-Saied Mohammed | AI Engineer | [saifs22](https://github.com/saifs22) | [Saif El Dien El Saied](https://www.linkedin.com/in/saif-el-dien-el-saied-a63794325/) |
| Karim Abdel-Hakim Amer | AI Engineer | [Karim-Abdel-Hakim-Amer](https://github.com/Karim-Abdel-Hakim-Amer) | [Karim Abd-Elhakim](https://www.linkedin.com/in/karimabdelhakim/) |
| Amr Bakr | Data Scientist | [AmrBakr12](https://github.com/Amrbakr12) | [Amr Bakr](https://www.linkedin.com/in/amr-bakr-91616b271/) |
| Moamen Hekal | DevOps Engineer | [MoamenHekal](https://github.com/MOAMEN-HAKEL) | [Moamen Hekal](https://www.linkedin.com/in/moamen-hakel-401380358/) |

We would like to thank our academic supervisor: **Dr.Mahmoud Mounir Mahmoud** for his guidance throughout the project.

---

<div align="center">

Made with ❤️ for the love of clean architecture and academic integrity.

</div>
