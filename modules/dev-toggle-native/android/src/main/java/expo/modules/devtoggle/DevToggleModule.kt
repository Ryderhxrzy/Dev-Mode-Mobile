package expo.modules.devtoggle

import android.content.Context
import android.content.ComponentName
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import java.io.File
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket
import java.util.Collections
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.TranslatorOptions
import rikka.shizuku.Shizuku
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues

class DevToggleModule : Module() {
  private val developerKey = "development_settings_enabled"
  private val usbKey = "adb_enabled"
  private val wirelessKey = "adb_wifi_enabled"

  // Animation scales (Global settings)
  private val windowAnimationKey = Settings.Global.WINDOW_ANIMATION_SCALE
  private val transitionAnimationKey = Settings.Global.TRANSITION_ANIMATION_SCALE
  private val animatorDurationKey = Settings.Global.ANIMATOR_DURATION_SCALE

  // Extra dev options
  private val stayAwakeKey = Settings.Global.STAY_ON_WHILE_PLUGGED_IN
  private val keepScreenOnKey = "stay_on_while_plugged_in"
  private val showTouchesKey = "show_touches"
  private val pointerLocationKey = "pointer_location"

  private fun context() = appContext.reactContext ?: throw CodedException("ERR_CONTEXT", "Android context is unavailable.", null)

  private fun read(key: String): String = try {
    if (Settings.Global.getInt(context().contentResolver, key, 0) == 1) "enabled" else "disabled"
  } catch (_: Exception) { "disabled" }

  private fun readSystem(key: String): String = try {
    if (Settings.System.getInt(context().contentResolver, key, 0) == 1) "enabled" else "disabled"
  } catch (_: Exception) { "disabled" }

  private fun readFloat(key: String): Float = try {
    Settings.Global.getFloat(context().contentResolver, key)
  } catch (_: Exception) { 1.0f }

  private fun permission(): String = try {
    if (context().checkSelfPermission("android.permission.WRITE_SECURE_SETTINGS") == PackageManager.PERMISSION_GRANTED) "granted" else "denied"
  } catch (_: Exception) { "unknown" }

  private fun shizukuRunning(): Boolean = try {
    !Shizuku.isPreV11() && Shizuku.pingBinder()
  } catch (_: Exception) { false }

  private fun shizukuAuthorized(): Boolean = try {
    shizukuRunning() && Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED
  } catch (_: Exception) { false }

  private fun shizukuStatus(): String = try {
    when {
      !shizukuRunning() -> "unavailable"
      shizukuAuthorized() -> "authorized"
      else -> "needs_permission"
    }
  } catch (_: Exception) { "unavailable" }

  private fun canWriteSystem(): Boolean = try {
    Settings.System.canWrite(context())
  } catch (_: Exception) { false }

  private fun writeShizukuSetting(namespace: String, key: String, value: Int): Boolean {
    if (!shizukuAuthorized()) return false
    return try {
      val method = Shizuku::class.java.getDeclaredMethod(
        "newProcess",
        Array<String>::class.java,
        Array<String>::class.java,
        String::class.java
      )
      method.isAccessible = true
      val p = method.invoke(
        null,
        arrayOf("sh", "-c", "settings put $namespace $key $value"),
        null,
        null
      ) as java.lang.Process
      p.waitFor() == 0
    } catch (_: Exception) {
      false
    }
  }

  private fun writeGlobalSetting(key: String, value: Int): Boolean {
    if (permission() == "granted") {
      try {
        if (Settings.Global.putInt(context().contentResolver, key, value)) return true
      } catch (_: Exception) {}
    }
    return writeShizukuSetting("global", key, value)
  }

  private fun writeSystemSetting(key: String, value: Int): Boolean {
    if (canWriteSystem()) {
      try {
        if (Settings.System.putInt(context().contentResolver, key, value)) return true
      } catch (_: Exception) {}
    }
    if (shizukuAuthorized()) {
      val ok = writeShizukuSetting("system", key, value)
      if (ok) return true
    }
    try {
      if (Settings.System.putInt(context().contentResolver, key, value)) return true
    } catch (_: Exception) {}
    try {
      val process = Runtime.getRuntime().exec(arrayOf("settings", "put", "system", key, value.toString()))
      process.waitFor()
      if (process.exitValue() == 0) return true
    } catch (_: Exception) {}
    return false
  }

  private fun prefs() = context().getSharedPreferences("devtoggle_local_prefs", android.content.Context.MODE_PRIVATE)

  private fun translationLanguage(tag: String): String? = when (tag.lowercase()) {
    "fil" -> "tl"
    "pt-br" -> "pt"
    "zh-cn" -> "zh"
    "zh-tw" -> "zh"
    else -> tag.substringBefore('-').lowercase()
  }

  private fun translatorFor(targetTag: String) = translationLanguage(targetTag)?.let { target ->
    if (target == "en") return@let null
    val targetLanguage = TranslateLanguage.fromLanguageTag(target) ?: return@let null
    Translation.getClient(
      TranslatorOptions.Builder()
        .setSourceLanguage(TranslateLanguage.ENGLISH)
        .setTargetLanguage(targetLanguage)
        .build()
    )
  }

  private fun getWirelessDebuggingEndpoint(): String? = AdbEndpointHelper.getEndpoint(context())

  override fun definition() = ModuleDefinition {
    Name("DevToggle")

    OnCreate {
      try {
        appContext.reactContext?.let { DevToggleBridgeServer.start(it) }
      } catch (_: Exception) {}
    }

    AsyncFunction("getStatus") {
      try { DevToggleBridgeServer.start(context()) } catch (_: Exception) {}
      val endpoint = getWirelessDebuggingEndpoint()
      val isWirelessActive = endpoint != null || read(wirelessKey) == "enabled"
      try { DevToggleNotificationManager.updateNotification(context()) } catch (_: Exception) {}
      mapOf(
        "developerOptions" to read(developerKey),
        "usbDebugging" to read(usbKey),
        "wirelessDebugging" to (if (isWirelessActive) "enabled" else read(wirelessKey)),
        "wirelessEndpoint" to endpoint,
        "writeSecureSettings" to permission(),
        "notificationMode" to DevToggleNotificationManager.getNotificationMode(context()),
        "shizukuStatus" to shizukuStatus(),
        "nativeAvailable" to true
      )
    }

    AsyncFunction("getWirelessEndpoint") {
      getWirelessDebuggingEndpoint()
    }

    AsyncFunction("getNotificationMode") {
      DevToggleNotificationManager.getNotificationMode(context())
    }

    AsyncFunction("setNotificationMode") { mode: String ->
      DevToggleNotificationManager.setNotificationMode(context(), mode)
      mapOf(
        "mode" to DevToggleNotificationManager.getNotificationMode(context()),
        "success" to true
      )
    }

    AsyncFunction("hasNotificationPermission") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context().checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
      } else {
        true
      }
    }

    AsyncFunction("requestNotificationPermission") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val act = appContext.currentActivity
        if (act != null) {
          act.requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 9901)
          true
        } else {
          false
        }
      } else {
        true
      }
    }

    AsyncFunction("getPermissionStatus") { permission() }

    AsyncFunction("getShizukuStatus") { shizukuStatus() }

    AsyncFunction("requestShizukuPermission") {
      if (!shizukuRunning()) return@AsyncFunction false
      if (shizukuAuthorized()) return@AsyncFunction true
      try {
        Shizuku.requestPermission(9902)
        true
      } catch (_: Exception) { false }
    }

    AsyncFunction("openShizuku") {
      try {
        context().startActivity(
          Intent("moe.shizuku.manager.action.MAIN").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        true
      } catch (_: Exception) {
        false
      }
    }

    AsyncFunction("getOnboardingComplete") {
      try { prefs().getBoolean("onboarding_complete", false) } catch (_: Exception) { false }
    }

    AsyncFunction("setOnboardingComplete") { complete: Boolean ->
      try { prefs().edit().putBoolean("onboarding_complete", complete).commit() } catch (_: Exception) { false }
    }

    AsyncFunction("getLanguagePreference") {
      prefs().getString("language_preference", "auto") ?: "auto"
    }

    AsyncFunction("setLanguagePreference") { language: String ->
      val saved = prefs().edit().putString("language_preference", language).commit()
      if (saved) {
        try { DevToggleWidgetProvider.updateAllWidgets(context()) } catch (_: Exception) {}
        try { DevToggleNotificationManager.updateNotification(context()) } catch (_: Exception) {}
      }
      saved
    }

    AsyncFunction("downloadTranslationModel") { language: String ->
      val translator = translatorFor(language) ?: return@AsyncFunction language == "en" || language == "auto"
      val target = translationLanguage(language)
      try {
        val downloaded = Tasks.await(
          RemoteModelManager.getInstance().getDownloadedModels(TranslateRemoteModel::class.java)
        )
        val targetLanguage = target?.let { TranslateLanguage.fromLanguageTag(it) }
        if (targetLanguage != null && downloaded.any { it.language == targetLanguage }) {
          return@AsyncFunction true
        }
        // Let ML Kit use the device's currently available connection. The UI
        // already asks the user to download over Wi-Fi, but requiring the
        // transport here incorrectly rejects hotspots and some OEM Wi-Fi APIs.
        val conditions = DownloadConditions.Builder().build()
        Tasks.await(translator.downloadModelIfNeeded(conditions))
        true
      } catch (_: Exception) {
        false
      } finally {
        translator.close()
      }
    }.runOnQueue(Queues.DEFAULT)

    AsyncFunction("isTranslationModelDownloaded") { language: String ->
      val target = translationLanguage(language)
      if (target == "en") return@AsyncFunction true
      val targetLanguage = target?.let { TranslateLanguage.fromLanguageTag(it) } ?: return@AsyncFunction false
      try {
        val downloaded = Tasks.await(
          RemoteModelManager.getInstance().getDownloadedModels(TranslateRemoteModel::class.java)
        )
        downloaded.any { it.language == targetLanguage }
      } catch (_: Exception) {
        false
      }
    }.runOnQueue(Queues.DEFAULT)

    AsyncFunction("translateText") { text: String, language: String ->
      if (text.isBlank() || language == "en" || language == "auto") return@AsyncFunction text
      val translator = translatorFor(language) ?: return@AsyncFunction text
      try {
        Tasks.await(translator.downloadModelIfNeeded(DownloadConditions.Builder().build()))
        Tasks.await(translator.translate(text))
      } catch (_: Exception) {
        text
      } finally {
        translator.close()
      }
    }.runOnQueue(Queues.DEFAULT)

    // Animation Scales
    AsyncFunction("getAnimationScales") {
      mapOf(
        "window" to readFloat(windowAnimationKey),
        "transition" to readFloat(transitionAnimationKey),
        "animator" to readFloat(animatorDurationKey)
      )
    }

    AsyncFunction("setAnimationScale") { type: String, scale: Float ->
      if (permission() != "granted") {
        return@AsyncFunction mapOf("changed" to false, "message" to "WRITE_SECURE_SETTINGS is not granted.")
      }
      val resolver = context().contentResolver
      val key = when (type) {
        "window" -> windowAnimationKey
        "transition" -> transitionAnimationKey
        "animator" -> animatorDurationKey
        else -> null
      }
      try {
        if (key != null) {
          Settings.Global.putFloat(resolver, key, scale)
        } else {
          // All animation scales
          Settings.Global.putFloat(resolver, windowAnimationKey, scale)
          Settings.Global.putFloat(resolver, transitionAnimationKey, scale)
          Settings.Global.putFloat(resolver, animatorDurationKey, scale)
        }
        mapOf("changed" to true, "message" to "Animation scale set to ${scale}x")
      } catch (_: Exception) {
        mapOf("changed" to false, "message" to "Failed to set animation scale.")
      }
    }

    // Extended settings query
    AsyncFunction("getExtraSettings") {
      val stayAwake = try {
        val v = Settings.Global.getInt(context().contentResolver, stayAwakeKey)
        if (v > 0) "enabled" else "disabled"
      } catch (_: Exception) { "unknown" }

      mapOf(
        "stayAwake" to stayAwake,
        "showTouches" to readSystem(showTouchesKey),
        "pointerLocation" to readSystem(pointerLocationKey),
        "keepWirelessOn" to (if (DevToggleBridgeServer.isKeepWirelessOn(context())) "enabled" else "disabled"),
        "webRemote" to (if (DevToggleBridgeServer.isWebRemoteEnabled(context())) "enabled" else "disabled"),
        "autoWirelessConnect" to (if (DevToggleBridgeServer.isAutoWirelessConnect(context())) "enabled" else "disabled")
      )
    }

    AsyncFunction("getPerformanceMetrics") {
      DevToggleBridgeServer.getPerformanceMetricsJson(context())
    }

    AsyncFunction("getDeviceInfo") {
      DevToggleBridgeServer.getDeviceInfoJson(context())
    }

    AsyncFunction("setExtraSetting") { setting: String, enabled: Boolean ->
      // App preferences: no special permissions needed
      if (setting == "keepWirelessOn") {
        DevToggleBridgeServer.setKeepWirelessOn(context(), enabled)
        return@AsyncFunction mapOf("changed" to true, "message" to "Setting updated.")
      }
      if (setting == "webRemote") {
        DevToggleBridgeServer.setWebRemoteEnabled(context(), enabled)
        return@AsyncFunction mapOf("changed" to true, "message" to "Web Remote setting updated.")
      }
      if (setting == "autoWirelessConnect") {
        DevToggleBridgeServer.setAutoWirelessConnect(context(), enabled)
        return@AsyncFunction mapOf("changed" to true, "message" to "Auto Wireless Connect setting updated.")
      }

      val intVal = if (enabled) 1 else 0

      if (setting == "stayAwake") {
        if (permission() != "granted" && !shizukuAuthorized()) {
          return@AsyncFunction mapOf("changed" to false, "message" to "WRITE_SECURE_SETTINGS or Shizuku is required.")
        }
        val written = writeGlobalSetting(stayAwakeKey, if (enabled) 7 else 0)
        return@AsyncFunction mapOf(
          "changed" to written,
          "message" to if (written) "Stay awake updated." else "Could not update stay awake."
        )
      }

      if (setting == "showTouches" || setting == "pointerLocation") {
        val key = if (setting == "showTouches") showTouchesKey else pointerLocationKey
        val label = if (setting == "showTouches") "Visual Touch Taps" else "Pointer Location Tracker"
        val written = writeSystemSetting(key, intVal)
        if (written) {
          return@AsyncFunction mapOf("changed" to true, "message" to "$label updated.")
        }

        // If direct write didn't succeed and app cannot write system settings and Shizuku is not authorized, prompt to enable permission
        if (!canWriteSystem() && !shizukuAuthorized()) {
          try {
            val intent = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
              data = android.net.Uri.parse("package:${context().packageName}")
              addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context().startActivity(intent)
            return@AsyncFunction mapOf(
              "changed" to false,
              "message" to "Please allow 'Modify system settings' in the settings screen that just opened, or authorize Shizuku."
            )
          } catch (_: Exception) {}
        }

        return@AsyncFunction mapOf(
          "changed" to false,
          "message" to "Permission required to toggle $label. Grant Modify System Settings or authorize via Shizuku."
        )
      }

      throw CodedException("ERR_SETTING", "Unknown setting: $setting", null)
    }

    AsyncFunction("canWriteSystemSettings") {
      canWriteSystem()
    }

    AsyncFunction("openWriteSettingsPermission") {
      try {
        val intent = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
          data = android.net.Uri.parse("package:${context().packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context().startActivity(intent)
        true
      } catch (_: Exception) {
        false
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("openSettings") { setting: String ->
      val action = when (setting) {
        "wirelessDebugging" -> "android.settings.WIRELESS_DEBUGGING_SETTINGS"
        else -> Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS
      }
      try {
        context().startActivity(Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        mapOf("opened" to true, "message" to "Opened Android Settings.")
      } catch (_: Exception) {
        try {
          context().startActivity(Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
          mapOf("opened" to true, "message" to "Opened Developer Options.")
        } catch (_: Exception) {
          mapOf("opened" to false, "message" to "Android Settings could not be opened.")
        }
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setEnabled") { setting: String, enabled: Boolean ->
      if (permission() != "granted" && !shizukuAuthorized()) {
        val message = if (shizukuStatus() == "needs_permission") {
          "Authorize Dev Mode in Shizuku before using this toggle."
        } else {
          "WRITE_SECURE_SETTINGS is not granted. Use Shizuku or the ADB setup guide."
        }
        return@AsyncFunction mapOf("changed" to false, "message" to message)
      }
      val settingKey = when (setting) {
        "developerOptions" -> developerKey
        "usbDebugging" -> usbKey
        "wirelessDebugging" -> wirelessKey
        else -> throw CodedException("ERR_SETTING", "Unsupported setting.", null)
      }
      if ((setting == "usbDebugging" || setting == "wirelessDebugging") && enabled) {
        val devOn = read(developerKey) == "enabled"
        if (!devOn) {
          val label = if (setting == "usbDebugging") "USB Debugging" else "Wireless Debugging"
          return@AsyncFunction mapOf(
            "changed" to false,
            "message" to "Developer Mode must be ON to enable $label"
          )
        }
      }
      try {
        val written = writeGlobalSetting(settingKey, if (enabled) 1 else 0)

        // When disabling Developer Options, automatically turn off USB and Wireless Debugging
        if (setting == "developerOptions" && !enabled) {
          writeGlobalSetting(usbKey, 0)
          writeGlobalSetting(wirelessKey, 0)
        }

        val now = read(settingKey)
        val expected = if (enabled) "enabled" else "disabled"
        if (written && now == expected) {
          DevToggleWidgetProvider.updateAllWidgets(context())
          try { DevToggleNotificationManager.updateNotification(context()) } catch (_: Exception) {}
          try { DevToggleNotificationManager.notifyToggle(context(), setting, enabled) } catch (_: Exception) {}
        }
        mapOf(
          "changed" to (written && now == expected),
          "message" to if (written && now == expected) "Android reported the updated state." else "Android blocked or did not apply this change."
        )
      } catch (_: Exception) {
        mapOf("changed" to false, "message" to "Android blocked this protected operation.")
      }
    }

    // MediaProjection disabled.
    // AsyncFunction("isScreenMirroring") { DevToggleScreenMirrorManager.isStreaming() }
    // AsyncFunction("startScreenMirror") { DevToggleScreenCaptureActivity.start(context()); true }
    // AsyncFunction("stopScreenMirror") { DevToggleScreenCaptureActivity.stop(context()); true }
    // AsyncFunction("getScreenMirrorUrl") { ... }
    // AsyncFunction("getScreenMirrorStatus") { ... }

    // App Shield (Auto-disable Dev Options for protected apps)
    AsyncFunction("getAppShieldSettings") {
      mapOf(
        "enabled" to AppShieldManager.isEnabled(context()),
        "hasUsageAccess" to AppShieldManager.hasUsageAccess(context()),
        "protectedPackages" to AppShieldManager.getProtectedPackages(context())
      )
    }

    AsyncFunction("setAppShieldEnabled") { enabled: Boolean ->
      AppShieldManager.setEnabled(context(), enabled)
    }

    AsyncFunction("setProtectedPackages") { packages: List<String> ->
      AppShieldManager.setProtectedPackages(context(), packages)
    }

    AsyncFunction("getInstalledApps") {
      AppShieldManager.getInstalledApps(context())
    }

    AsyncFunction("openUsageAccessSettings") {
      AppShieldManager.openUsageAccessSettings(context())
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("launchProtectedApp") { packageName: String ->
      AppShieldManager.launchProtectedApp(context(), packageName)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("createShieldedShortcut") { packageName: String ->
      AppShieldManager.createShieldedShortcut(context(), packageName)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("openBatteryOptimizationSettings") {
      try {
        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context().startActivity(intent)
        true
      } catch (_: Exception) {
        try {
          val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = android.net.Uri.parse("package:${context().packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
          context().startActivity(intent)
          true
        } catch (_: Exception) {
          false
        }
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("openAppDetailsSettings") {
      try {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = android.net.Uri.parse("package:${context().packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context().startActivity(intent)
        true
      } catch (_: Exception) {
        false
      }
    }.runOnQueue(Queues.MAIN)

    Function("isWidgetPinningSupported") {
      AppShieldManager.isWidgetPinningSupported(context())
    }

    AsyncFunction("pinShieldWidget1x1") { packageName: String ->
      AppShieldManager.requestPinShieldWidget1x1(context(), packageName)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("pinShieldWidget3x1") {
      AppShieldManager.requestPinShieldWidget3x1(context())
    }.runOnQueue(Queues.MAIN)
  }
}
