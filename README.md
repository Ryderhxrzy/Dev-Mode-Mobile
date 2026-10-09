# Dev Toggle

Android utility for quick access to Developer Options, USB Debugging, and Wireless Debugging. The launcher name is **Dev Toggle**; the planned Google Play listing title is **Dev-Option: Toggle**. The Android application ID is `com.devtoggle.app`.

## What it can actually do

| Capability | Behavior |
| --- | --- |
| Read status | The Kotlin module reads Android global settings where the device permits it; otherwise the UI says **Unknown**. |
| Open Developer Options | Uses Android's supported Developer Options intent. |
| Open USB Debugging | Opens Developer Options, where USB Debugging is located. |
| Open Wireless Debugging | Tries the device's Wireless Debugging settings intent and falls back to Developer Options. |
| Change settings | Only attempted after Android confirms `WRITE_SECURE_SETTINGS`. The app rereads the value and reports failure if Android blocks it. |

The app never treats a button tap as success. It does not use root, hidden APIs, or Accessibility automation. Manufacturer ROMs and Android versions can refuse reads, settings intents, or writes.

## Windows ADB setup

1. Download [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools), extract the Windows ZIP, open the `platform-tools` folder, type `cmd` in its address bar, and press Enter.
2. Enable Developer Options and USB Debugging manually on the phone, connect a data-capable USB cable, and accept the phone's ADB authorization dialog.
3. Run `adb devices`. Continue only when the device has the `device` status (not `unauthorized`).
4. Run:

   ```text
   adb shell pm grant com.devtoggle.app android.permission.WRITE_SECURE_SETTINGS
   ```

5. Return to the app and choose **Check Permission**. The Android-native check determines the displayed result.

If the grant fails, reconnect and re-authorize the phone, check that `adb devices` says `device`, and make sure the installed app uses the same application ID. Reinstalling the app or resetting the device may require granting it again.

## Development and builds

The native module lives at `modules/dev-toggle-native` and is automatically linked by Expo prebuild. It requires an Android development or production build; Expo Go cannot include it.

```bash
npx expo prebuild --clean
npx expo start --dev-client
```

Build with EAS:

```bash
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform android --profile production
```

Run checks before submitting changes:

```bash
npx expo lint
npx tsc --noEmit
npx expo-doctor
```
