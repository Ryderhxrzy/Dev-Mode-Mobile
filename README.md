<div align="center">

  <h1>🚀 Dev Mode ⚡</h1>

  <p><strong>The Ultimate Rootless Android Developer Options & Quick-Toggle Utility</strong></p>

  <p>
    <a href="https://android.com"><img src="https://img.shields.io/badge/Platform-Android%207.0+-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform" /></a>
    <a href="https://expo.dev"><img src="https://img.shields.io/badge/Framework-Expo%20%2F%20React%20Native-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo" /></a>
    <a href="https://kotlinlang.org"><img src="https://img.shields.io/badge/Module-Kotlin%20%2F%20Native-7F52FF?style=flat-square&logo=kotlin&logoColor=white" alt="Kotlin" /></a>
    <a href="#-license--attribution"><img src="https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square" alt="License" /></a>
  </p>
  <p>
    <a href="https://github.com/Ryderhxrzy/Dev-Mode-Mobile"><img src="https://img.shields.io/badge/Release-v1.0.0-0284C7?style=flat-square&logo=github&logoColor=white" alt="Release" /></a>
    <img src="https://img.shields.io/badge/Root-Not%20Required-22C55E?style=flat-square" alt="Rootless" />
    <img src="https://img.shields.io/badge/Telemetry-Zero-10B981?style=flat-square" alt="Telemetry" />
    <img src="https://img.shields.io/badge/Security-Local%20Only-06B6D4?style=flat-square" alt="Security" />
  </p>

  <p>
    A high-performance Android utility built for developers, power users, and modders to instantly toggle Developer Options, ADB Debugging, and System Performance scales without navigating deep into Android Settings.
  </p>

</div>

---

## 📸 App Screenshots

<div align="center">

| 📱 Dashboard & Controls | ⚙️ Developer Settings | 🔔 Notification Settings |
| :---: | :---: | :---: |
| <img src="assets/images/promotion/page_1.png" width="240" alt="Dashboard & Controls" /> | <img src="assets/images/promotion/page_2.png" width="240" alt="Developer Settings" /> | <img src="assets/images/promotion/page_3.png" width="240" alt="Notification Settings" /> |
| **Core Hardware Controls** | **Advanced Dev Options** | **Notification Shade Modes** |
| 1-tap Dev Options, USB & Wireless ADB | Stay awake, touch taps & scales | Always on & dynamic triggers |

<br />

| 🔔 Push Notification Persistent | 📲 Home Screen Widgets | 💻 One-Time ADB Setup |
| :---: | :---: | :---: |
| <img src="assets/images/promotion/page_4.png" width="240" alt="Push Notification Persistent" /> | <img src="assets/images/promotion/page_5.png" width="240" alt="Home Screen Widgets" /> | <img src="assets/images/promotion/page_7.png" width="240" alt="One-Time ADB Setup" /> |
| **Persistent Notification Shade** | **Desktop Launcher Widgets** | **Step-by-Step Authorization** |
| Live status bar quick toggle chips | 3x1 multi-bar & 1x1 toggle buttons | 1-time setup via PC or Shizuku |

</div>

---

## ✨ Features Overview

| Category | Feature | Description | System Target / Scope | Rootless? |
| :--- | :--- | :--- | :--- | :---: |
| **Core Debugging** | **Master Developer Options** | Instant 1-tap toggle for Android's system developer mode without navigating deep into Settings menus. | `development_settings_enabled` | ✅ Yes |
| **Core Debugging** | **USB Debugging** | Fast direct toggle allowing authorized PC debugging over physical USB cable. | `adb_enabled` | ✅ Yes |
| **Core Debugging** | **Wireless ADB Debugging** | Wi-Fi ADB toggle with live dynamic IP:port socket display and 1-tap clipboard copy pill. | `adb_wifi_enabled` + port polling | ✅ Yes |
| **Performance** | **Device Speed Booster** | Direct 1-tap boost setting Window, Transition, and Animator scales to **0.5x** for instant UI responses. | UI Duration Multipliers | ✅ Yes |
| **Performance** | **Custom Animation Scales** | Fine-grained tuning presets: Off (0.0x), Ultra Fast (0.25x), Snappy (0.5x), Standard (1.0x), Relaxed (1.5x). | Window / Transition / Animator | ✅ Yes |
| **System Tools** | **Stay Awake While Charging** | Keeps the device screen illuminated indefinitely while connected to AC power or USB. | `stay_on_while_plugged_in` | ✅ Yes |
| **System Tools** | **Show Visual Touch Taps** | Displays visible circular touch tap highlights on screen for screen recording and UI review. | `show_touches` | ✅ Yes |
| **System Tools** | **Pointer Location Tracker** | Overlays real-time screen touch coordinates, pressure, and crosshair tracker data. | `pointer_location` | ✅ Yes |
| **Launcher Widgets**| **3x1 Multi-Control Widget** | Horizontal desktop widget for Developer Options, USB ADB, and Wireless ADB with live status indicators. | Native `AppWidgetProvider` | ✅ Yes |
| **Launcher Widgets**| **1x1 Single Button Widgets** | Independent square widgets for Dev Mode, USB ADB, or Wireless ADB for customizable home screen layouts. | Native RemoteViews broadcast | ✅ Yes |
| **Status Bar Bar** | **Quick Controls Notification** | Ongoing Android notification shade bar featuring interactive 1-tap toggle chips for instant access. | Android Notification Shade | ✅ Yes |
| **Maintenance** | **Instant Cleanup** | 1-tap restoration that resets all animation scales to 1.0x, disables overlays, and wipes local preferences. | System Reset & Local Preferences | ✅ Yes |
| **Privacy & Sec** | **Zero Telemetry** | 100% offline, zero trackers, zero cloud storage, no account required, and fully revocable permissions. | Local Device Exclusive | ✅ Yes |

---

## 📲 Home Screen Widget Setup

<div align="center">
  <img src="assets/images/promotion/page_6.png" width="340" alt="Widgets on Android Home Screen" />
  <p><em>Zero-latency 1x1 & 3x1 widgets on Android desktop launcher with real-time sync.</em></p>
</div>

Dev Mode offers both a comprehensive **3-in-1 multi-control bar** and individual **1x1 standalone widgets**:

1. **Long-press** any empty space on your Android home screen.
2. Tap **Widgets** in the launcher popup menu and scroll to **Dev Mode**.
3. Choose your preferred format:
   - **3-in-1 Quick Toggle (3x1)**: Access Developer Options, USB Debugging, and Wireless ADB side-by-side.
   - **Dev Mode (1x1)**: Dedicated single button for Developer Options.
   - **USB Debugging (1x1)**: Dedicated single button for USB ADB.
   - **Wireless ADB (1x1)**: Dedicated single button for Wireless ADB.
4. Drag and drop the widget onto your home screen. Tapping tiles toggles system states instantly in the background without needing to launch the full app.

---

## 🚀 One-Time Setup (ADB Grant)

Because modifying Android developer settings requires elevated privileges, `Dev Mode` requires a one-time permission grant via standard ADB:

### Prerequisites
1. Enable **Developer Options** and **USB Debugging** manually on your phone once.
2. Connect your smartphone to your PC via USB cable.

### Grant Command

Open your terminal or command prompt on your computer and execute:

```bash
adb shell pm grant com.devmode.app android.permission.WRITE_SECURE_SETTINGS
```

> **Using Shizuku?** You can also authorize the permission directly on-device using [Shizuku](https://shizuku.rikka.app/) without needing a PC connection.

### Revoking Permission

You maintain 100% authority over your device. You can revoke this permission at any time from your computer:

```bash
adb shell pm revoke com.devmode.app android.permission.WRITE_SECURE_SETTINGS
```
*(or simply by uninstalling the application).*

---

## 🛠️ Development & Building

The project is built using **Expo (React Native)** with a custom native Kotlin module located in `modules/dev-toggle-native/`.

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

# Build & launch on connected Android device
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
