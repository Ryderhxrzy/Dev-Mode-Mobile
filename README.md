<div align="center">

  <h1>🚀 Dev Mode ⚡</h1>

  <p><strong>The Ultimate Rootless Android Developer Options & Quick-Toggle Utility</strong></p>

  <p>
    <a href="https://android.com"><img src="https://img.shields.io/badge/Platform-Android%207.0+-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform" /></a>
    <a href="https://expo.dev"><img src="https://img.shields.io/badge/Framework-Expo%20%2F%20React%20Native-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo" /></a>
    <a href="https://kotlinlang.org"><img src="https://img.shields.io/badge/Module-Kotlin%20%2F%20Native-7F52FF?style=flat-square&logo=kotlin&logoColor=white" alt="Kotlin" /></a>
    <a href="#license--attribution"><img src="https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square" alt="License" /></a>
  </p>
  <p>
    <a href="https://github.com/Ryderhxrzy/Developer-Option-Toggle"><img src="https://img.shields.io/badge/Release-v1.0.0-0284C7?style=flat-square&logo=github&logoColor=white" alt="Release" /></a>
    <img src="https://img.shields.io/badge/Root-Not%20Required-22C55E?style=flat-square" alt="Rootless" />
    <img src="https://img.shields.io/badge/Telemetry-Zero-10B981?style=flat-square" alt="Telemetry" />
  </p>

  <p>
    A high-performance Android utility built for developers, power users, and modders to instantly toggle Developer Options, ADB Debugging, and System Performance scales without navigating deep into Android Settings.
  </p>

</div>

---

## ✨ Features

### ⚡ 1-Tap Master Developer Options Switch
- Instant toggling of Android's master developer switch (`development_settings_enabled`).
- Zero reliance on slow UI automation or accessibility services.
- Real-time verification that validates settings changes directly against `Settings.Global`.

### 🔌 USB & Wireless ADB Debugging Controls
- Quick toggling of **USB Debugging** (`adb_enabled`).
- Toggling of **Wireless Debugging** (`adb_wifi_enabled`) on Android 11+ devices.
- **Live Socket Endpoint Display**: Displays the device's actual Wi-Fi IP and dynamic ADB port (e.g., `192.168.1.4:34245`) with a 1-tap clipboard copy pill.

### 📲 3-in-1 Home Screen Quick-Toggle AppWidget
- Control **Developer Options**, **USB Debugging**, and **Wireless ADB** directly from your Android Home Screen.
- **Zero-Latency**: Toggles execute immediately in the background via native `AppWidgetProvider` broadcasts without opening the app.
- **Adaptive Visual Feedback**: Displays active emerald green highlights (`#15803D`) when enabled and dark muted styling (`#0E1D17`) when inactive.

### 🚀 Device Speed Booster (0.5x Scale Optimization)
- Boost UI responsiveness with one tap by setting Window, Transition, and Animator scales to **0.5x**.
- **Custom Dropdown Presets**: Choose between **Off (Disabled)**, **0.25x**, **0.5x**, or default **1.0x** animations.

### 🧰 Native Developer Overlays & Debugging Tools
- **Show Layout Bounds**: Inspect UI view bounds and clip margins on screen.
- **Profile GPU Rendering**: Visualize hardware rendering performance bars in real time.
- **Show Pointer Location & Touches**: Debug touch inputs and coordinates.
- **Stay Awake While Charging**: Keep screen illuminated during development sessions.

### 🧹 Instant Cleanup
- 1-tap restoration that resets all animation scales back to default (1.0x) and turns off visual overlays.

### 🛡️ Zero-Root & Complete Privacy
- Functions 100% rootless through the standard Android `WRITE_SECURE_SETTINGS` permission.
- Zero analytics, zero telemetry, zero background battery drain, and no internet permissions required.

---

## 📱 Home Screen Widget Setup

1. Long-press any empty space on your Android home screen.
2. Tap **Widgets** and scroll to **Dev Mode** (or search for *Dev Mode*).
3. Drag the **Dev Mode Quick Toggle** widget onto your home screen.
4. Tap any of the 3 tiles (**Dev Mode**, **USB**, **Wireless**) to toggle settings instantly with zero lag.

---

## 🚀 One-Time Setup (ADB Grant)

Because modifying system developer settings requires elevated privileges, `Dev Mode` requires a one-time permission grant via standard ADB:

### Prerequisites
- Enable **Developer Options** and **USB Debugging** manually on your phone once.
- Connect your phone to your PC via USB cable.

### Command

Open your terminal or command prompt and execute:

```bash
adb shell pm grant com.devmode.app android.permission.WRITE_SECURE_SETTINGS
```

> **Using Shizuku?** You can also authorize the permission directly on-device using [Shizuku](https://shizuku.rikka.app/) without needing a PC.

Once granted, open the app and tap **Check Permission** to verify access.

---

## 🛠️ Development & Building

The application is built using **Expo (React Native)** with a custom native Kotlin module located in `modules/dev-toggle-native/`.

### Prerequisites
- Node.js 18+
- Android SDK (API 34+) & JDK 17

### Local Setup

```bash
# Install dependencies
npm install

# Run TypeScript type check
npx tsc --noEmit

# Run code linter
npx expo lint

# Build native Android debug project
npx expo prebuild --clean
npx expo run:android
```

### Cloud Builds with EAS

```bash
# Development build
npx eas-cli@latest build --platform android --profile development

# Production APK / AAB
npx eas-cli@latest build --platform android --profile production
```

---

## 🤝 Contributing & Pull Requests

Contributions, feedback, and pull requests are welcomed!

- **Fork the Repository**: Feel free to fork the project and adapt it for your workflow.
- **Give Credit**: If you use this codebase or build upon it, please provide attribution and a link back to this repository.
- **Submit Pull Requests**: Check out open issues or propose new developer utilities through a PR.

---

## 📄 License & Attribution

This project is open-source software licensed under the **[MIT License](LICENSE)**.

**Copyright © 2026 Jhayr Cervantes ([GitHub: @Ryderhxrzy](https://github.com/Ryderhxrzy))**

### Redistribution & Attribution Terms
Under the MIT License, you are free to use, modify, and distribute this software for personal or commercial projects, provided that:
- You **must retain** the original copyright notice and permission notice in all copies or substantial portions of the software.
- Credit is given to the author (**Jhayr Cervantes** / **@Ryderhxrzy**).

### Third-Party Acknowledgments
- **Expo & React Native**: Copyright (c) 650 Industries, Inc. (Licensed under MIT).
- **Lucide Icons**: Copyright (c) Lucide Contributors (Licensed under ISC).
