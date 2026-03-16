# 🎓 Horas — Backend & AI Proctoring System

> A unified **FastAPI** web server tightly integrated with a real-time **Machine Learning** proctoring engine for online exam integrity.

The AI engine and the backend share a **single virtual environment** to ensure seamless communication, zero networking latency, and leak-free memory management.

---

## ⚙️ Installation Guide

> [!CAUTION]
> Dependencies **must** be installed in the exact order below to prevent binary conflicts between PyTorch, MediaPipe, and Whisper.

### Step 1 — Create the Unified Virtual Environment

Create and activate a single Python virtual environment inside the **root backend folder**.  
Do **not** create a separate `.venv` inside the AI folder.

```bash
py -3.10 -m venv .venv

# Windows
.venv\Scripts\activate

# Mac / Linux
source .venv/bin/activate
```

### Step 2 — Install GPU-Accelerated PyTorch

Install the **CUDA 13.0** PyTorch wheels first. This ensures YOLO and DeepFace utilize the GPU instead of defaulting to slower CPU binaries.

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu130
```

### Step 3 — Prevent Audio Library Conflicts

`faster-whisper` will break if `ctranslate2` is not installed first. Lock in the correct binaries before proceeding.

```bash
pip install ctranslate2>=4.0.0
```

### Step 4 — Install Remaining Dependencies

Once the core ML binaries are locked in, install the rest of the web server and AI dependencies.

```bash
pip install -r requirements.txt
```

---

## 🚀 Running the Server

Because `proctoring_manager` dynamically adjusts `sys.path` to encapsulate the AI engine's internal imports, you **must** start the server with standard Python rather than the `fastapi dev` CLI tool.

```bash
python main.py
```

| Resource | URL |
| :--- | :--- |
| **Server** | `http://127.0.0.1:8000` |
| **Swagger UI Docs** | `http://127.0.0.1:8000/docs` |

> [!NOTE]
> The SQLite database (`database.db`) and all tables are **auto-generated** on the first run.

---

## 📂 Integration Architecture

| Module | Role |
| :--- | :--- |
| `AI_Engine/` | Drop-in proctoring module — treated entirely as a black-box library. |
| `services/proctoring_manager.py` | Active controller — feeds WebSocket frames to the AI queue and translates AI alerts into internal REST API calls. |
| `routers/streaming.py` | Passive bi-directional WebSocket pipe for student video feeds and live warnings. |
| `routers/events.py` | REST endpoints that permanently save cheating evidence and screenshots to the database. |