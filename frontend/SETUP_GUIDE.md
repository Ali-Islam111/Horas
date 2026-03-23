# دليل ربط React Frontend مع Flask Backend محليًا

## 📋 المتطلبات الأساسية

- Node.js مثبت
- Python 3.8+ مثبت
- Git مثبت

---

## 🚀 خطوات التشغيل

### 1️⃣ تشغيل Backend (Flask)

افتح terminal جديد واتبع الخطوات:

```powershell
# الانتقال للمجلد الرئيسي
cd "D:\A gradution Project"

# استنساخ Backend Repository
git clone https://github.com/mohamedemad6244/AI_Proctoring.git

# الدخول للمجلد
cd AI_Proctoring

# إنشاء Virtual Environment
python -m venv venv

# تفعيل Virtual Environment
.\venv\Scripts\activate

# تثبيت المكتبات المطلوبة
pip install -r requirements.txt

# تثبيت Flask-CORS للسماح بالاتصال من React
pip install flask-cors

# تشغيل Flask Server
python app.py
```

**ملحوظة:** Flask server سيعمل على `http://localhost:5000`

---

### 2️⃣ تشغيل Frontend (React)

افتح terminal آخر:

```powershell
# الانتقال لمجلد React
cd "D:\A gradution Project\frount\my-react-app"

# تشغيل Development Server
npm run dev
```

**ملحوظة:** React server سيعمل على `http://localhost:5174` أو `http://localhost:5175`

---

## 🔧 إعدادات CORS في Backend

تأكد من إضافة CORS في Flask `app.py`:

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# السماح بطلبات من React Frontend
CORS(app, origins=["http://localhost:5174", "http://localhost:5175"])

# أو السماح لجميع المصادر (للتطوير فقط)
# CORS(app)

@app.route('/api/proctoring/analyze', methods=['POST'])
def analyze_proctoring():
    # معالجة البيانات المرسلة من React
    video_frame = request.files.get('video_frame')
    audio_chunk = request.files.get('audio_chunk')
    timestamp = request.form.get('timestamp')
    
    # تحليل AI
    # ...
    
    return jsonify({
        'gaze_off_screen': False,
        'phone_detected': False,
        'audio_suspicious': False,
        'risk_level': 'low'
    })
```

---

## 📡 API Endpoint المستخدم

الـ React Frontend يرسل البيانات إلى:

```
POST http://localhost:5000/api/proctoring/analyze
```

**البيانات المرسلة (FormData):**
- `video_frame`: JPEG image blob
- `audio_chunk`: WebM audio blob
- `timestamp`: ISO timestamp string

**الاستجابة المتوقعة (JSON):**
```json
{
  "gaze_off_screen": false,
  "phone_detected": false,
  "audio_suspicious": false,
  "risk_level": "low"
}
```

---

## 🧪 اختبار الاتصال

1. شغل Flask Backend في terminal
2. شغل React Frontend في terminal آخر
3. افتح المتصفح على `http://localhost:5175`
4. سجل دخول كـ Examiner
5. اضغط على "Live Monitor" من Dashboard
6. تأكد من:
   - تشغيل الكاميرا والميكروفون
   - إرسال البيانات كل ثانية
   - ظهور النتائج من AI

---

## ❌ حل المشاكل الشائعة

### مشكلة CORS

**الخطأ:**
```
Access to fetch at 'http://localhost:5000' has been blocked by CORS policy
```

**الحل:**
```powershell
pip install flask-cors
```

أضف في `app.py`:
```python
from flask_cors import CORS
CORS(app)
```

---

### Backend لا يعمل

**تأكد من:**
- Python مثبت: `python --version`
- Virtual environment مفعل
- جميع المكتبات مثبتة: `pip list`
- لا يوجد خطأ في `app.py`

---

### Frontend لا يرسل البيانات

**تأكد من:**
- الكاميرا والميكروفون مفعلين في المتصفح
- API_URL صحيح في `ProctoringMonitor.jsx`
- Flask Backend شغال
- لا توجد أخطاء في Console

---

## 📁 هيكل المشروع

```
D:\A gradution Project\
├── frount\
│   └── my-react-app\          # React Frontend
│       ├── src\
│       │   └── components\
│       │       └── ProctoringMonitor.jsx
│       └── package.json
│
└── AI_Proctoring\             # Flask Backend
    ├── app.py
    ├── requirements.txt
    └── venv\
```

---

## 🎯 الصفحات المتصلة بـ Live Monitor

1. **ExaminerDashboard** - كارت "Live Monitor" 
2. **ExaminerAlerts** - زر "Live Monitor" في الـ Header
3. **ExaminerStudents** - زر "Live Monitor" في الفلتر

---

## 📞 للدعم

إذا واجهت أي مشكلة:
1. تأكد من تشغيل Backend و Frontend معًا
2. افحص Console في المتصفح
3. افحص Terminal الخاص بـ Flask للأخطاء
4. تأكد من CORS مفعل

---

**تم إعداده بواسطة:** GitHub Copilot  
**التاريخ:** December 12, 2025
