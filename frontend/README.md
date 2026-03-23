# AI Proctoring Exam Platform (Horas)

منصة امتحانات إلكترونية مع مراقبة ذكية في الوقت الحقيقي.

## 1) مكونات المشروع

- Frontend: React + Vite
- Backend API: FastAPI
- AI Engine: YOLO + MediaPipe + DeepFace + Whisper
- Database: SQLite
- Real-time stream: WebSocket (`/ws/proctor/{session_id}`)

---

## 2) المتطلبات الأساسية (لكل عضو في الفريق)

### نظام التشغيل
- Windows 10/11 (مجرّب)

### أدوات عامة
- Git
- Node.js 18 أو أحدث
- Python 3.10.x (مهم جدًا للـ AI)

### للـ GPU (اختياري لكن موصى به)
- NVIDIA GPU
- تعريف NVIDIA حديث
- CUDA متوافق مع بيئة PyTorch المستخدمة

---

## 3) تنزيل المشروع

```powershell
git clone <YOUR_REPO_URL>
cd my-react-app
```

> استبدل `<YOUR_REPO_URL>` برابط الريبو الفعلي.

---

## 4) إعداد Frontend (مرة واحدة)

```powershell
npm install
```

تشغيل يومي:

```powershell
npm run dev -- --host 0.0.0.0 --port 5173
```

- الواجهة: `http://127.0.0.1:5173`

---

## 5) إعداد Backend + AI

> **مهم:** شغّل backend من داخل مجلد `backend` وليس من جذر المشروع.

```powershell
cd backend
```

### الخيار A (الموصى به): استخدام البيئة الجاهزة GPU

لو المجلد موجود عندك:
- `backend/AI_engine/.venv-ai-gpu`

شغّل مباشرة:

```powershell
& ".\AI_engine\.venv-ai-gpu\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### الخيار B: إنشاء بيئة جديدة (CPU أو GPU)

1) أنشئ بيئة Python 3.10:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2) ثبّت متطلبات API:

```powershell
pip install -r backend\requirements.txt
```

3) ثبّت متطلبات AI:

```powershell
pip install -r AI_engine\requirements.txt
```

4) (اختياري للـ GPU) ثبّت PyTorch CUDA wheels قبل متطلبات AI إذا أردت أعلى أداء:

```powershell
pip install --index-url https://download.pytorch.org/whl/cu121 torch==2.5.1+cu121 torchvision==0.20.1+cu121 torchaudio==2.5.1+cu121
```

ثم أعد تثبيت:

```powershell
pip install -r AI_engine\requirements.txt
```

بعدها شغّل backend:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

---

## 6) إعداد ملف البيئة `.env` للـ Backend (ضروري)

أنشئ ملف:
- `backend/.env`

واكتب فيه (مثال تطوير):

```env
API_PREFIX=/api
DEBUG=True
DATABASE_URL=sqlite:///./horas.db
ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173

SECRET_KEY=change_this_to_a_long_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/api/auth/google/callback
FRONTEND_URL=http://127.0.0.1:5173
```

> لو `SECRET_KEY` غير موجود، backend لن يعمل.

---

## 7) التشغيل اليومي السريع (Terminalين)

### Terminal 1 (Backend)

```powershell
cd backend
& ".\AI_engine\.venv-ai-gpu\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2 (Frontend)

```powershell
cd my-react-app
npm run dev -- --host 0.0.0.0 --port 5173
```

---

## 8) اختبار سريع بعد التشغيل

1. افتح `http://127.0.0.1:5173`
2. سجّل دخول
3. ابدأ امتحان كطالب
4. اسمح بالكاميرا/المايك
5. راقب logs في backend وتأكد من اتصال WebSocket
6. افتح شاشة Alerts للممتحن وتأكد أن الأحداث تظهر

---

## 9) ما الذي تم تثبيته في الكود حاليًا

- `StudentExam` يعمل عبر WebSocket الحقيقي
- تسجيل أحداث AI في جدول `events`
- endpoints الخاصة بالأحداث تستخدم `/api/events/...`
- شاشة Alerts مربوطة بـ session محدد (وليست global)

---

## 10) أشهر المشاكل وحلها

### A) `Failed to fetch all events: 404`
- السبب: endpoint خاطئ بدون `/api`
- الحل: استخدام `/api/events/all` أو `/api/events/session/{id}`

### B) Alerts لا تظهر
- تأكد أن فيه `session_id` موجود في `localStorage`
- تأكد أن الطالب بدأ امتحان فعليًا
- تأكد backend شغال على 8000

### C) backend يبدأ لكن AI لا يعمل
- غالبًا backend شغال ببيئة Python مختلفة
- شغّل بالأمر الموصى به من `.venv-ai-gpu`

### D) مشكلة CORS
- راجع `ALLOWED_ORIGINS` في `backend/.env`
- لازم تشمل `http://127.0.0.1:5173` و `http://localhost:5173`

---

## 11) أوامر مفيدة

Build frontend:

```powershell
npm run build
```

فحص backend:

```powershell
curl.exe http://127.0.0.1:8000/
```

فحص frontend:

```powershell
curl.exe http://127.0.0.1:5173/
```

---

## 12) ملاحظة مهمة للفريق

بعض الملفات القديمة في المشروع (مثل سكربتات Flask على بورت 5000) لم تعد المرجع الحالي.

**المرجع الصحيح الآن:**
- Frontend: Vite على `5173`
- Backend: FastAPI على `8000`
- Streaming: WebSocket على `/ws/proctor/{session_id}`
