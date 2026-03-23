# اختبار الاتصال بين Frontend و Backend

## 🔍 كيف تتأكد أن Frontend شغال مع Backend؟

### **1. افتح Developer Console في المتصفح**

**الطريقة:**
- اضغط `F12` أو `Ctrl + Shift + I`
- اذهب لتبويب **Console**

---

### **2. الرسائل المتوقعة في Console**

#### ✅ **عند نجاح الاتصال:**

```
🎬 [PROCTORING] Initializing camera and microphone...
✅ [PROCTORING] Media devices access granted
📹 [PROCTORING] Camera stream connected
🎤 [PROCTORING] Microphone recorder ready
🚀 [PROCTORING] System ready - Will send data to: http://localhost:5000/api/proctoring/analyze

🎥 [PROCTORING] Starting capture...
📸 [PROCTORING] Video frame captured: 45678 bytes
🎤 [PROCTORING] Audio chunk captured: 12345 bytes
📤 [PROCTORING] Sending to Backend: http://localhost:5000/api/proctoring/analyze
📥 [PROCTORING] Response status: 200 OK
✅ [PROCTORING] Backend response: {
  gaze_off_screen: false,
  phone_detected: false,
  audio_suspicious: false,
  risk_level: "low"
}
```

#### ❌ **عند فشل الاتصال:**

**مشكلة CORS:**
```
❌ [PROCTORING] Error: Failed to fetch
Access to fetch at 'http://localhost:5000' from origin 'http://localhost:5174' has been blocked by CORS policy
```
**الحل:** تأكد من تثبيت Flask-CORS في Backend

**مشكلة Backend مش شغال:**
```
❌ [PROCTORING] Error: API Error: Failed to fetch
📍 [PROCTORING] API URL: http://localhost:5000/api/proctoring/analyze
```
**الحل:** تأكد من تشغيل Flask server

**مشكلة Endpoint غلط:**
```
❌ [PROCTORING] Error: API Error: 404 Not Found
📥 [PROCTORING] Response status: 404 Not Found
```
**الحل:** تأكد من الـ endpoint الصحيح في Flask

---

### **3. افحص Network Tab**

في Developer Tools:
1. اذهب لتبويب **Network**
2. اختر فلتر **Fetch/XHR**
3. شاهد الطلبات المرسلة كل ثانية
4. اضغط على أي طلب لرؤية:
   - **Request Headers**
   - **Response**
   - **Status Code** (يجب أن يكون 200)

---

### **4. علامات النجاح المرئية**

#### في **ProctoringMonitor page:**

✅ **System Status:**
- Camera: `Active` (أخضر)
- Microphone: `Active` (أخضر)
- API Status: `Sending...` ثم `Ready` (يتبدل كل ثانية)

✅ **AI Analysis Results:**
- تظهر البيانات من Backend:
  - Gaze Off Screen: YES/NO
  - Phone Detected: YES/NO
  - Audio Suspicious: YES/NO
  - Risk Level: LOW/MEDIUM/HIGH

✅ **Raw JSON Response:**
- يتحدث كل ثانية
- يظهر timestamp جديد
- يظهر البيانات المستلمة من Backend

---

### **5. اختبار Backend يدوياً (Postman/cURL)**

**باستخدام PowerShell:**

```powershell
# إرسال طلب للتأكد من أن Backend شغال
Invoke-WebRequest -Uri "http://localhost:5000/api/proctoring/analyze" -Method POST -ContentType "multipart/form-data" -Body @{
    video_frame = [System.IO.File]::ReadAllBytes("test.jpg")
    audio_chunk = [System.IO.File]::ReadAllBytes("test.webm")
    timestamp = (Get-Date).ToString("o")
}
```

---

### **6. Checklist سريع ✓**

قبل ما تبدأ، تأكد من:

- [ ] Flask Backend شغال على `http://localhost:5000`
- [ ] React Frontend شغال على `http://localhost:5174` أو `5175`
- [ ] CORS مفعل في Flask (`flask-cors` مثبت)
- [ ] API_URL في ProctoringMonitor.jsx صحيح
- [ ] Console مفتوح في المتصفح
- [ ] الكاميرا والميكروفون مفعلين

---

### **7. الأخطاء الشائعة وحلولها**

| الخطأ | السبب | الحل |
|-------|-------|------|
| `CORS policy blocked` | Backend مش فيه CORS | أضف `CORS(app)` في Flask |
| `Failed to fetch` | Backend مش شغال | شغل Flask server |
| `404 Not Found` | Endpoint غلط | افحص route في Flask |
| `Camera/Mic failed` | إذن مش متاح | اسمح للمتصفح بالوصول |
| `No response` | Backend بطيء | انتظر أو افحص Flask logs |

---

### **8. Flask Backend Logs**

في terminal الخاص بـ Flask، المفروض تشوف:

```
127.0.0.1 - - [12/Dec/2025 10:30:45] "POST /api/proctoring/analyze HTTP/1.1" 200 -
127.0.0.1 - - [12/Dec/2025 10:30:46] "POST /api/proctoring/analyze HTTP/1.1" 200 -
127.0.0.1 - - [12/Dec/2025 10:30:47] "POST /api/proctoring/analyze HTTP/1.1" 200 -
```

إذا شفت رقم `200` يعني نجح الطلب ✅

---

## 🎯 ملخص سريع

**Frontend شغال مع Backend إذا:**

1. ✅ Console فيه رسائل `✅ [PROCTORING] Backend response:`
2. ✅ Network tab فيه طلبات ناجحة (200)
3. ✅ AI Analysis Results بتتحدث كل ثانية
4. ✅ Flask logs فيها POST requests
5. ✅ لا توجد أخطاء CORS

**افتح Console في المتصفح وشاهد الرسائل - هذه أسهل طريقة للتأكد! 🔍**
