import time
from detectors.audio import MicMonitor

def audio_callback(display, conf, transcript=""):
    print(f"[Audio Event] {display} (conf={conf:.2f}) {transcript}")

mic = MicMonitor(audio_callback)
mic.start()

print("Audio monitor started. Speak into the microphone. Press Ctrl+C to stop.")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Stopping...")
    mic.stop()