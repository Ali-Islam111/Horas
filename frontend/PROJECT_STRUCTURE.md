# AI Proctoring System - Full Stack Project

## 📁 Project Structure

```
Horas/
├── src/                          # Frontend React Application
│   ├── components/              # React Components
│   │   ├── Login.jsx
│   │   ├── CreateAccount.jsx
│   │   ├── ExaminerDashboard.jsx
│   │   ├── ExamCreation.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── StudentExam.jsx
│   │   └── ProctoringMonitor.jsx
│   ├── services/                # API Services
│   ├── hooks/                   # Custom React Hooks
│   └── config/                  # Configuration Files
│
├── backend/                     # Flask Backend API
│   ├── app.py                  # Main Flask Application
│   ├── proctor_system.py       # Core Proctoring Logic
│   └── proctor_system_api.py   # API Endpoints
│
├── public/                      # Static Assets
├── vite.config.js              # Vite Configuration
├── package.json                # Frontend Dependencies
├── setup-backend.ps1           # Backend Setup Script
└── start-project.ps1           # Full Project Startup Script
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/IbrahimAlBatrawshy/Horas.git
cd Horas
```

2. **Setup Frontend**
```bash
npm install
```

3. **Setup Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

### Running the Project

**Option 1: Use automated script (Windows)**
```powershell
.\start-project.ps1
```

**Option 2: Manual startup**

Terminal 1 - Backend:
```bash
cd backend
venv\Scripts\activate
python app.py
```

Terminal 2 - Frontend:
```bash
npm run dev
```

## 🌐 GitHub Repository

**Main Repository**: https://github.com/IbrahimAlBatrawshy/Horas.git

**Branch**: BeforeApi

## 📝 Features

### Frontend (React + Vite)
- Student Dashboard & Exam Interface
- Examiner Dashboard & Exam Creation
- Real-time Proctoring Monitor
- User Authentication

### Backend (Flask + Python)
- AI-powered Proctoring System
- Face Detection & Recognition
- Anomaly Detection
- RESTful API Endpoints

## 🔧 Technology Stack

**Frontend:**
- React 18
- Vite
- React Router
- Tailwind CSS

**Backend:**
- Flask
- OpenCV
- TensorFlow/PyTorch
- Face Recognition Libraries

## 📚 Documentation

- [Setup Guide](SETUP_GUIDE.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Backend Integration](backend/AI_MONITORING_INTEGRATION.md)

## 👥 Contributors

Project developed as a graduation project for AI-based exam proctoring.

## 📄 License

See [LICENSE](backend/LICENSE) for details.
