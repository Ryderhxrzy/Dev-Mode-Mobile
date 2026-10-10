package expo.modules.devtoggle

import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import java.net.Inet4Address
import java.net.NetworkInterface
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
    if (Settings.Global.getInt(context().contentResolver, key) == 1) "enabled" else "disabled"
  } catch (_: Exception) { "unknown" }

  private fun readSystem(key: String): String = try {
    if (Settings.System.getInt(context().contentResolver, key) == 1) "enabled" else "disabled"
  } catch (_: Exception) { "unknown" }

  private fun readFloat(key: String): Float = try {
    Settings.Global.getFloat(context().contentResolver, key)
  } catch (_: Exception) { 1.0f }

  private fun permission(): String = try {
    if (context().checkSelfPermission("android.permission.WRITE_SECURE_SETTINGS") == PackageManager.PERMISSION_GRANTED) "granted" else "denied"
  } catch (_: Exception) { "unknown" }

  private fun prefs() = context().getSharedPreferences("devtoggle_local_prefs", android.content.Context.MODE_PRIVATE)

  private fun getLocalIpAddress(): String? {
    try {
      val interfaces = NetworkInterface.getNetworkInterfaces()
      while (interfaces.hasMoreElements()) {
        val intf = interfaces.nextElement()
        if (!intf.isLoopback && intf.isUp) {
          val addrs = intf.inetAddresses
          while (addrs.hasMoreElements()) {
            val addr = addrs.nextElement()
            if (!addr.isLoopbackAddress && addr is Inet4Address) {
              return addr.hostAddress
            }
          }
        }
      }
    } catch (_: Exception) {}
    return null
  }

  private fun getAdbPort(): Int {
    try {
      val p = Settings.Global.getInt(context().contentResolver, "adb_wifi_port")
      if (p > 0) return p
    } catch (_: Exception) {}

    try {
      val propClass = Class.forName("android.os.SystemProperties")
      val getIntMethod = propClass.getMethod("getInt", String::class.java, Int::class.javaPrimitiveType)
      val p = getIntMethod.invoke(null, "service.adb.tcp.port", -1) as Int
      if (p > 0) return p
    } catch (_: Exception) {}

    try {
      val p = Settings.Global.getInt(context().contentResolver, "adb_port")
      if (p > 0) return p
    } catch (_: Exception) {}

    return -1
  }

  private fun getWirelessDebuggingEndpoint(): String? {
    val isEnabled = read(wirelessKey) == "enabled"
    if (!isEnabled) return null

    val ip = getLocalIpAddress()
    val port = getAdbPort()
    return when {
      ip != null && port > 0 -> "$ip:$port"
      ip != null -> "$ip:5555"
      else -> null
    }
  }

  override fun definition() = ModuleDefinition {
    Name("DevToggle")

    AsyncFunction("getStatus") {
      mapOf(
        "developerOptions" to read(developerKey),
        "usbDebugging" to read(usbKey),
        "wirelessDebugging" to read(wirelessKey),
        "wirelessEndpoint" to getWirelessDebuggingEndpoint(),
        "writeSecureSettings" to permission(),
        "nativeAvailable" to true
      )
    }

    AsyncFunction("getWirelessEndpoint") {
      getWirelessDebuggingEndpoint()
    }

    AsyncFunction("getPermissionStatus") { permission() }

    AsyncFunction("getOnboardingComplete") {
      try { prefs().getBoolean("onboarding_complete", false) } catch (_: Exception) { false }
    }

    AsyncFunction("setOnboardingComplete") { complete: Boolean ->
      try { prefs().edit().putBoolean("onboarding_complete", complete).commit() } catch (_: Exception) { false }
    }

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
        "pointerLocation" to readSystem(pointerLocationKey)
      )
    }

    AsyncFunction("setExtraSetting") { setting: String, enabled: Boolean ->
      if (permission() != "granted") {
        return@AsyncFunction mapOf("changed" to false, "message" to "WRITE_SECURE_SETTINGS is not granted.")
      }
      val resolver = context().contentResolver
      val intVal = if (enabled) 1 else 0
      try {
        when (setting) {
          "stayAwake" -> {
            // 7 = Battery + AC + USB awake
            Settings.Global.putInt(resolver, stayAwakeKey, if (enabled) 7 else 0)
          }
          "showTouches" -> {
            Settings.System.putInt(resolver, showTouchesKey, intVal)
          }
          "pointerLocation" -> {
            Settings.System.putInt(resolver, pointerLocationKey, intVal)
          }
          else -> throw CodedException("ERR_SETTING", "Unknown setting: $setting", null)
        }
        mapOf("changed" to true, "message" to "Setting updated.")
      } catch (_: Exception) {
        mapOf("changed" to false, "message" to "Could not update setting.")
      }
    }

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
      if (permission() != "granted") return@AsyncFunction mapOf("changed" to false, "message" to "WRITE_SECURE_SETTINGS is not granted. Use the ADB setup guide.")
      val settingKey = when (setting) {
        "developerOptions" -> developerKey
        "usbDebugging" -> usbKey
        "wirelessDebugging" -> wirelessKey
        else -> throw CodedException("ERR_SETTING", "Unsupported setting.", null)
      }
      try {
        val written = Settings.Global.putInt(context().contentResolver, settingKey, if (enabled) 1 else 0)
        val now = read(settingKey)
        val expected = if (enabled) "enabled" else "disabled"
        if (written && now == expected) {
          DevToggleWidgetProvider.updateAllWidgets(context())
        }
        mapOf(
          "changed" to (written && now == expected),
          "message" to if (written && now == expected) "Android reported the updated state." else "Android blocked or did not apply this change."
        )
      } catch (_: Exception) {
        mapOf("changed" to false, "message" to "Android blocked this protected operation.")
      }
    }
  }
}
