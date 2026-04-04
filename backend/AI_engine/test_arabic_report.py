#!/usr/bin/env python3
# ==============================================================
# test_arabic_report.py  —  Test Arabic transcription in PDF reports
# ==============================================================
#
# This script tests whether Arabic transcriptions render correctly
# in the PDF reports without showing black squares (■■■■■■).

import os
from datetime import datetime, timedelta
from reports.pdf_report import generate

# Test events with Arabic transcriptions
test_events = [
    {
        'source': 'AUDIO',
        'event_type': 'speech_detected',
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'details': 'confidence=0.92 | transcript="السلام عليكم ورحمة الله وبركاته"',
        'severity': 1,
        'screenshot': '',
    },
    {
        'source': 'AUDIO',
        'event_type': 'speech_detected',
        'timestamp': (datetime.now() + timedelta(seconds=5)).strftime("%Y-%m-%d %H:%M:%S"),
        'details': 'confidence=0.88 | transcript="انا اسمي كريم"',
        'severity': 1,
        'screenshot': '',
    },
    {
        'source': 'AUDIO',
        'event_type': 'speech_detected',
        'timestamp': (datetime.now() + timedelta(seconds=10)).strftime("%Y-%m-%d %H:%M:%S"),
        'details': 'confidence=0.85 | transcript="كيف حالك انت؟"',
        'severity': 1,
        'screenshot': '',
    },
    {
        'source': 'HEAD_POSE',
        'event_type': 'head_away',
        'timestamp': (datetime.now() + timedelta(seconds=15)).strftime("%Y-%m-%d %H:%M:%S"),
        'details': 'yaw=-45.2°',
        'severity': 2,
        'screenshot': '',
    },
    {
        'source': 'AUDIO',
        'event_type': 'speech_detected',
        'timestamp': (datetime.now() + timedelta(seconds=20)).strftime("%Y-%m-%d %H:%M:%S"),
        'details': 'confidence=0.90 | transcript="المرة دي صحيح جدا يا جماعة"',
        'severity': 1,
        'screenshot': '',
    },
]

# Generate test report
print("[Test] Generating Arabic transcript test report...")
session_id = f"test_arabic_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
end_time = (datetime.now() + timedelta(seconds=30)).strftime("%Y-%m-%d %H:%M:%S")

pdf_path = generate(
    events=test_events,
    session_id=session_id,
    student_name="Test Student - Arabic",
    start_time=start_time,
    end_time=end_time,
    reference_image=None,
    attention_history=[(i*5, 50+i*5) for i in range(6)],
    detector_stats={"AUDIO": {"model": "whisper-large-v3", "language": "ar"}},
)

if pdf_path:
    print(f"✓ [Test] Report generated successfully!")
    print(f"  Location: {pdf_path}")
    print(f"\n[Test] Please open the PDF and verify:")
    print(f"  ✓ Arabic transcriptions are displayed (NOT ■■■■■■)")
    print(f"  ✓ Text is readable and properly formatted")
else:
    print("✗ [Test] Report generation FAILED!")
