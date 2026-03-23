# Setup Guide - AI Proctor Mobile App

## Quick Start

### 1. Install Flutter

#### Windows
1. Download Flutter SDK from [flutter.dev](https://docs.flutter.dev/get-started/install/windows)
2. Extract to `C:\src\flutter`
3. Add to PATH: `C:\src\flutter\bin`
4. Run: `flutter doctor`

#### macOS
```bash
brew install flutter
flutter doctor
```

#### Linux
```bash
sudo snap install flutter --classic
flutter doctor
```

### 2. Install Dependencies

```bash
cd "mobile app"
flutter pub get
```

### 3. Setup Android Studio (for Android Development)

1. Download and install [Android Studio](https://developer.android.com/studio)
2. Install Android SDK
3. Install Android Emulator or connect physical device
4. Run: `flutter doctor --android-licenses`

### 4. Setup Xcode (for iOS Development - macOS only)

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

### 5. Configure Backend Connection

Edit `lib/config/api_config.dart`:

```dart
static const String baseUrl = 'http://YOUR_IP_ADDRESS:5000';
```

**Important**: Replace `YOUR_IP_ADDRESS` with:
- Your computer's local IP (e.g., `192.168.1.100`)
- DO NOT use `localhost` or `127.0.0.1` when testing on physical device

To find your IP:
- Windows: `ipconfig`
- macOS/Linux: `ifconfig` or `ip addr`

### 6. Run the App

```bash
# List available devices
flutter devices

# Run on connected device
flutter run

# Run on specific device
flutter run -d <device_id>

# Run in release mode
flutter run --release
```

## Platform-Specific Setup

### Android

1. **Enable Developer Options** on your device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → Developer Options → Enable USB Debugging

2. **Connect device** via USB and allow debugging

3. **Add permissions** (already included in AndroidManifest.xml):
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.INTERNET" />
   ```

### iOS

1. **Open project** in Xcode:
   ```bash
   open ios/Runner.xcworkspace
   ```

2. **Update Bundle Identifier** in Xcode

3. **Add permissions** to `ios/Runner/Info.plist` (already included):
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>Camera is required for exam proctoring</string>
   <key>NSMicrophoneUsageDescription</key>
   <string>Microphone is required for audio monitoring</string>
   ```

4. **Sign the app** with your Apple Developer account

## Building for Release

### Android APK

```bash
# Build APK
flutter build apk --release

# Build App Bundle (for Play Store)
flutter build appbundle --release

# Output location
build/app/outputs/flutter-apk/app-release.apk
```

### iOS

```bash
# Build for iOS
flutter build ios --release

# Archive in Xcode for App Store
open ios/Runner.xcworkspace
# Product → Archive
```

## Testing

### Run on Emulator

```bash
# Android Emulator
flutter emulators
flutter emulators --launch <emulator_id>
flutter run

# iOS Simulator (macOS only)
open -a Simulator
flutter run
```

### Hot Reload During Development

- Press `r` in terminal for hot reload
- Press `R` for hot restart
- Press `q` to quit

## Common Issues

### Issue: "Waiting for another flutter command to release the startup lock"
```bash
rm -rf /tmp/flutter_tools_lock
```

### Issue: Camera not working
- Check permissions in device settings
- Restart app
- Re-run: `flutter run`

### Issue: Can't connect to backend
- Verify backend is running
- Use your computer's IP, not localhost
- Check firewall settings
- Ensure device is on same network

### Issue: Build errors
```bash
flutter clean
flutter pub get
flutter run
```

### Issue: Gradle build failed (Android)
```bash
cd android
./gradlew clean
cd ..
flutter run
```

## Performance Optimization

### Enable Release Mode
```bash
flutter run --release
```

### Profile Mode (for debugging performance)
```bash
flutter run --profile
```

### Analyze Code
```bash
flutter analyze
```

## VS Code Setup

1. Install Extensions:
   - Flutter
   - Dart

2. Open Command Palette (Ctrl+Shift+P):
   - "Flutter: New Project"
   - "Flutter: Run Flutter Doctor"

3. Debug Configuration (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Flutter",
      "request": "launch",
      "type": "dart"
    }
  ]
}
```

## Useful Commands

```bash
# Check Flutter installation
flutter doctor -v

# Update Flutter
flutter upgrade

# List connected devices
flutter devices

# Install dependencies
flutter pub get

# Clean build files
flutter clean

# Run tests
flutter test

# Generate icons
flutter pub run flutter_launcher_icons:main

# Analyze code
flutter analyze

# Format code
flutter format lib/
```

## Next Steps

1. ✅ Install Flutter and dependencies
2. ✅ Configure backend URL
3. ✅ Run on device/emulator
4. ✅ Test login functionality
5. ✅ Test camera permissions
6. ✅ Test exam flow
7. ✅ Build release APK/IPA

## Resources

- [Flutter Documentation](https://docs.flutter.dev/)
- [Dart Language Tour](https://dart.dev/guides/language/language-tour)
- [Flutter Cookbook](https://docs.flutter.dev/cookbook)
- [Flutter YouTube Channel](https://www.youtube.com/flutterdev)

---

**Ready to start!** Run `flutter run` to launch the app. 🚀
