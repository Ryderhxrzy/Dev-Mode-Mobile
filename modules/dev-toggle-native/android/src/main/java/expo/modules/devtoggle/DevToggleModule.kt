package expo.modules.devtoggle

import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues

class DevToggleModule : Module() {
  // String keys avoid relying on non-SDK constants while still using the supported Settings provider.
  private val developerKey = "development_settings_enabled"
  private val usbKey = "adb_enabled"
  private val wirelessKey = "adb_wifi_enabled"
  private fun context() = appContext.reactContext ?: throw CodedException("ERR_CONTEXT", "Android context is unavailable.", null)
  private fun read(key: String): String = try { if (Settings.Global.getInt(context().contentResolver, key) == 1) "enabled" else "disabled" } catch (_: Exception) { "unknown" }
  private fun permission(): String = try { if (context().checkSelfPermission("android.permission.WRITE_SECURE_SETTINGS") == PackageManager.PERMISSION_GRANTED) "granted" else "denied" } catch (_: Exception) { "unknown" }
  private fun key(setting: String) = when (setting) { "developerOptions" -> developerKey; "usbDebugging" -> usbKey; "wirelessDebugging" -> wirelessKey; else -> throw CodedException("ERR_SETTING", "Unsupported setting.", null) }
  // Private, app-only storage. Never leaves the device and is wiped on uninstall.
  private fun prefs() = context().getSharedPreferences("devtoggle_local_prefs", android.content.Context.MODE_PRIVATE)
  override fun definition() = ModuleDefinition {
    Name("DevToggle")
    AsyncFunction("getStatus") { mapOf("developerOptions" to read(developerKey), "usbDebugging" to read(usbKey), "wirelessDebugging" to read(wirelessKey), "writeSecureSettings" to permission(), "nativeAvailable" to true) }
    AsyncFunction("getPermissionStatus") { permission() }
    AsyncFunction("getOnboardingComplete") { try { prefs().getBoolean("onboarding_complete", false) } catch (_: Exception) { false } }
    AsyncFunction("setOnboardingComplete") { complete: Boolean -> try { prefs().edit().putBoolean("onboarding_complete", complete).commit() } catch (_: Exception) { false } }
    AsyncFunction("openSettings") { setting: String ->
      val action = if (setting == "wirelessDebugging") "android.settings.WIRELESS_DEBUGGING_SETTINGS" else Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS
      try { context().startActivity(Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); mapOf("opened" to true, "message" to "Opened Android Settings.") }
      catch (_: Exception) { try { context().startActivity(Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); mapOf("opened" to true, "message" to "Opened Developer Options. Find the requested item there.") } catch (_: Exception) { mapOf("opened" to false, "message" to "Android Settings could not be opened on this device.") } }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setEnabled") { setting: String, enabled: Boolean ->
      if (permission() != "granted") return@AsyncFunction mapOf("changed" to false, "message" to "WRITE_SECURE_SETTINGS is not granted. Use the ADB setup guide.")
      val settingKey = key(setting)
      try { val written = Settings.Global.putInt(context().contentResolver, settingKey, if (enabled) 1 else 0); val now = read(settingKey); val expected = if (enabled) "enabled" else "disabled"; mapOf("changed" to (written && now == expected), "message" to if (written && now == expected) "Android reported the updated state." else "Android blocked or did not apply this change. Open Settings to manage it manually.") } catch (_: Exception) { mapOf("changed" to false, "message" to "Android blocked this protected operation. Open Settings to manage it manually.") }
    }
  }
}
