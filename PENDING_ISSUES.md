# 📋 Pending Issues & Feature Backlog

This document outlines active bugs, regressions, and synchronization enhancements identified for the **Dev Mode Ecosystem** (`dev-mode-cli` and `developer-option-toggle`).

---

## 🚨 Active Issues & Bug Tracker

### 1. Native Studio Crash: `findAndroidDir is not a function`
- **Component:** `dev-mode-cli` (`lib/studio.js`, `lib/dev.js`)
- **Severity:** High / Blocker for Native Android Mode
- **Status:** Pending Fix
- **Reproduction:**
  ```bash
  cd <any-android-or-kotlin-project>
  devmode start --native
  ```
- **Error Output:**
  ```text
  ⚡ DEV MODE NATIVE STUDIO (Android Studio Lightweight CLI)
  ───────────────────────────────────────────────────

  Unexpected error: findAndroidDir is not a function
  ```
- **Root Cause Analysis:**
  - `lib/studio.js` requires `{ findAndroidDir }` from `./dev`.
  - In `lib/dev.js`, `findAndroidDir` is implemented around line 78 but was inadvertently omitted from `module.exports` at the bottom of the file.
  - As a result, `findAndroidDir` evaluates to `undefined`, throwing a `TypeError` when invoked.
- **Planned Resolution:**
  - Add `findAndroidDir` to `module.exports` in `lib/dev.js`.
  - Add defensive fallback check in `lib/studio.js` (`typeof findAndroidDir === 'function'`).

---

### 2. Redundant / Duplicate ADB Toggle on `devmode start`
- **Component:** `dev-mode-cli` (`lib/dev.js`, `bin/dev-mode.js`)
- **Severity:** Medium / Workflow Inefficiency
- **Status:** Pending Optimization
- **Observed Behavior:**
  - When the developer already has **Wireless ADB** enabled and connected to the PC (e.g. `192.168.1.x:port`), running `devmode start` or `devmode run` still attempts to toggle or re-enable **USB Debugging**.
  - This results in duplicated connection checks, unnecessary ADB state changes, and prompts even when an active wireless debugging bridge is already operational.
- **Root Cause Analysis:**
  - Pre-flight checks inside `runExpoStart` / `devmode start` execute sequential ADB inspections:
    1. It checks if USB Debugging is ON.
    2. If USB Debugging is deemed disabled or not explicitly confirmed, it attempts to trigger `enableUsbDebugging` or guide the user, ignoring that `adb devices` already lists an active `device` connected via TCP/IP (`<ip>:<port>`).
- **Planned Resolution:**
  - Implement smart single-mode connection detection:
    - Check if any device in `adb devices` is currently in the `device` state.
    - If a Wireless ADB endpoint (`<ip>:<port>`) is already connected and responding, bypass the USB Debugging activation step completely.
    - Only prompt or activate USB Debugging if neither Wireless ADB nor a USB device is currently connected.

---

### 3. Widget (3x1 & 1x1) & Mobile App State Out-of-Sync on CLI Commands
- **Component:** `developer-option-toggle` (Android Native Widgets & App UI) + `dev-mode-cli`
- **Severity:** Medium / UX & Real-time State Desync
- **Status:** Pending Implementation
- **Observed Behavior:**
  - When the developer toggles Developer Options or USB Debugging from the terminal (e.g., `devmode on`, `devmode off`, `devmode usb on`, `devmode usb off`), the Android home screen widgets (**3x1 Quick Toggle** and **1x1 Compact Tile/Widget**) do not update immediately.
  - The in-app switches inside the Dev Mode mobile application also do not persistently reflect the updated state until the app is manually closed and reopened or refreshed.
- **Root Cause Analysis:**
  - The CLI updates global system settings via ADB (`settings put global development_settings_enabled 1` / `adb_enabled 1`) or Wi-Fi Bridge HTTP call.
  - Android home screen widgets (`AppWidgetProvider`) only redraw when:
    1. An explicit broadcast intent `android.appwidget.action.APPWIDGET_UPDATE` is dispatched with valid `appWidgetIds`.
    2. A background `ContentObserver` detects changes to `Settings.Global.DEVELOPMENT_SETTINGS_ENABLED` or `Settings.Global.ADB_ENABLED` and triggers widget redraws.
  - Currently, the mobile app lacks a persistent background `ContentObserver` to monitor external settings changes made via ADB from PC, causing widget views and React Native state to remain stale.
- **Planned Resolution:**
  - **In Mobile App (`developer-option-toggle`):**
    - Register a persistent Android `ContentObserver` in `DevToggleBridgeService` (or `MainApplication`) listening to `Settings.Global.getUriFor("development_settings_enabled")` and `Settings.Global.getUriFor("adb_enabled")`.
    - When a setting change is observed (even if triggered externally by ADB or PC terminal):
      1. Trigger immediate widget refresh for both `3x1` (`DevWidgetProvider`) and `1x1` (`DevCompactWidgetProvider`) widgets via `AppWidgetManager.getInstance(context).updateAppWidget(...)`.
      2. Emit a React Native DeviceEventEmitter event (`onDevSettingsChanged`) to update the app's React Native switch toggles in real-time.
  - **In CLI (`dev-mode-cli`):**
    - Ensure all CLI toggle commands (`devmode on`, `devmode off`, `devmode usb on`, `devmode usb off`) broadcast widget refresh intents immediately following `settings put`:
      ```bash
      adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE
      ```

---

### 4. Kotlin & Android Studio Project Auto-Detection Failure (`build.gradle.kts` / Gradle Wrapper)
- **Component:** `dev-mode-cli` (`lib/dev.js` - `findAndroidDir`, `runExpoStart`)
- **Severity:** High / Broken Auto-Routing for Kotlin Projects
- **Status:** Pending Fix
- **Reproduction:**
  ```bash
  cd <pure-kotlin-android-project>   # e.g. Fati-Market-Mobile
  devmode start
  ```
- **Error Output:**
  ```text
  🚀 DEV MODE STARTUP PRE-FLIGHT CHECKS
  ───────────────────────────────────────────────────

  ✖ Not an Expo or Android project: package.json does not contain "expo".
  Tip: Navigate into an Expo or Android project directory to start the server.
  ```
- **Root Cause Analysis:**
  - In `lib/dev.js`, `findAndroidDir()` only looks for Groovy Gradle files (`android/build.gradle` or `build.gradle` + `app`).
  - Many modern Kotlin / Android Studio projects use **Kotlin DSL (`build.gradle.kts`)**, `settings.gradle.kts`, or Gradle wrappers (`gradlew` / `gradlew.bat`).
  - Because `build.gradle.kts` is ignored, `findAndroidDir()` returns `null`.
  - Then `runExpoStart` inspects `package.json`, which either doesn't exist or has no `"expo"`, throwing: `Not an Expo or Android project: package.json does not contain "expo"`.
- **Planned Resolution:**
  - Expand `findAndroidDir()` to inspect:
    1. Root or subfolder `build.gradle.kts` / `build.gradle`
    2. `settings.gradle` / `settings.gradle.kts`
    3. `gradlew` / `gradlew.bat`
    4. `app/src/main/AndroidManifest.xml`
  - When any of these are present, immediately recognize the project as **Pure Native Android (Kotlin/Gradle)** and auto-route to Native Studio mode seamlessly without complaining about `package.json`.

---

### 5. Stale Dynamic Port Returned on Wireless Debugging Toggle (Error 10061)
- **Component:** `developer-option-toggle` (`AdbEndpointHelper.kt`) + `dev-mode-cli`
- **Severity:** Medium / Connection Failure on Re-toggle
- **Status:** Pending Fix
- **Reproduction:**
  1. Turn Developer Options / Wireless ADB OFF on phone.
  2. Run `devmode wifi on` from PC to turn it back ON via Wi-Fi bridge.
  3. Terminal displays:
     ```text
     ✔ Dynamic Port: 39209
     → Connecting without cable: adb connect 192.168.137.249:39209...
     ⚠ Connection attempt returned: cannot connect to 192.168.137.249:39209: No connection could be made because the target machine actively refused it. (10061)
     ```
- **Root Cause Analysis:**
  - When Wireless Debugging is turned OFF, Android terminates the port. When turned ON, Android assigns a **brand new random port**.
  - If the bridge request asks for the port before the Android OS finishes binding the new port, `AdbEndpointHelper.getPort(context)` falls back to returning the **persisted port from `SharedPreferences`** (`39209` from the previous session).
  - The PC tries to connect to this stale, closed port, causing TCP `WSAECONNREFUSED` (10061).
- **Planned Resolution:**
  - In `AdbEndpointHelper.kt`: Invalidate / clear cached and persisted ports immediately upon any `adb_wifi_enabled = 0` toggle.
  - Do not return a stale fallback port; wait for mDNS / `service.adb.tls.port` to report the new active port.
  - In `dev-mode-cli`: Add an automatic 1.5-second retry if the first connection attempt returns error 10061.

---

### 6. `devmode install:apk` Always Installs Debug APK Over Release APK
- **Component:** `dev-mode-cli` (`lib/dev.js` - `findLatestApk`, `installApk`)
- **Severity:** Medium / Incorrect Build Variant Installed
- **Status:** Pending Fix
- **Reproduction:**
  1. Build a release APK: `devmode build:android --release`
  2. Run: `devmode install:apk`
  3. CLI output:
     ```text
     → Installing APK to device: ...\apk\debug\app-debug.apk...
     ```
- **Root Cause Analysis:**
  - In `lib/dev.js`, `findLatestApk()` iterates over `candidateDirs`:
    ```javascript
    const candidateDirs = [
      path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug'),
      path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release')
    ];
    ```
  - It checks the `'debug'` directory first. If `app-debug.apk` exists, it returns it immediately without checking `'release'` and without comparing modification timestamps (`mtime`).
  - There is also no `--release` flag support for `install:apk`.
- **Planned Resolution:**
  - Pool all APKs from both `debug` and `release` directories and sort them collectively by `mtime` so the most recently compiled APK is installed by default.
  - Add explicit flag support: `devmode install:apk --release` and `devmode install:apk --debug`.

---

## 📌 Implementation Roadmap

| Priority | Task | Target Repo | Description |
| :---: | :--- | :--- | :--- |
| **P1** | Export `findAndroidDir` | `dev-mode-cli` | Export missing function in `lib/dev.js` to unblock `devmode start --native` |
| **P2** | Kotlin DSL & Gradle Project Detection | `dev-mode-cli` | Expand `findAndroidDir()` to support `build.gradle.kts`, `settings.gradle`, and `gradlew` |
| **P3** | Fix `install:apk` Release/Debug Priority | `dev-mode-cli` | Pick newest APK by `mtime` across variants and support `--release` flag |
| **P4** | Invalidate Stale Port Cache | `developer-option-toggle` | Clear persisted port on toggle to prevent connecting to dead ports (10061) |
| **P5** | Smart ADB Connection Filter | `dev-mode-cli` | Skip USB toggle when Wireless ADB session is already active |
| **P6** | Android `ContentObserver` | `developer-option-toggle` | Automatically update 3x1 and 1x1 widgets + in-app state on any external ADB toggle |
| **P7** | CLI Widget Broadcast Integration | `dev-mode-cli` | Dispatch explicit widget update broadcast upon setting changes |



