package expo.modules.devtoggle

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.wifi.WifiManager
import android.provider.Settings
import java.io.File
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections
import java.util.Locale
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
    // 1. ConnectivityManager (Active network IPv4)
    try {
      val cm = context().getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
      val activeNet = cm?.activeNetwork
      if (activeNet != null) {
        val lp = cm.getLinkProperties(activeNet)
        val ip = lp?.linkAddresses?.firstOrNull { it.address is Inet4Address && !it.address.isLoopbackAddress }?.address?.hostAddress
        if (!ip.isNullOrEmpty() && ip != "0.0.0.0") return ip
      }
    } catch (_: Exception) {}

    // 2. WifiManager (Legacy & Wi-Fi specific)
    try {
      val wifiManager = context().applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
      val ipInt = wifiManager?.connectionInfo?.ipAddress ?: 0
      if (ipInt != 0) {
        val ip = String.format(
          Locale.US,
          "%d.%d.%d.%d",
          ipInt and 0xff,
          ipInt shr 8 and 0xff,
          ipInt shr 16 and 0xff,
          ipInt shr 24 and 0xff
        )
        if (ip != "0.0.0.0") return ip
      }
    } catch (_: Exception) {}

    // 3. NetworkInterface prioritization (wlan / wifi / eth / any IPv4)
    try {
      val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
      // Check wlan/wifi first
      for (intf in interfaces.filter { it.name.startsWith("wlan", ignoreCase = true) || it.name.startsWith("wifi", ignoreCase = true) }) {
        for (addr in Collections.list(intf.inetAddresses)) {
          if (!addr.isLoopbackAddress && addr is Inet4Address && !addr.isLinkLocalAddress) {
            val host = addr.hostAddress
            if (!host.isNullOrEmpty() && host != "0.0.0.0") return host
          }
        }
      }
      // Check eth
      for (intf in interfaces.filter { it.name.startsWith("eth", ignoreCase = true) }) {
        for (addr in Collections.list(intf.inetAddresses)) {
          if (!addr.isLoopbackAddress && addr is Inet4Address && !addr.isLinkLocalAddress) {
            val host = addr.hostAddress
            if (!host.isNullOrEmpty() && host != "0.0.0.0") return host
          }
        }
      }
      // Fallback to any non-loopback IPv4
      for (intf in interfaces) {
        if (!intf.isLoopback && intf.isUp) {
          for (addr in Collections.list(intf.inetAddresses)) {
            if (!addr.isLoopbackAddress && addr is Inet4Address && !addr.isLinkLocalAddress) {
              val host = addr.hostAddress
              if (!host.isNullOrEmpty() && host != "0.0.0.0") return host
            }
          }
        }
      }
    } catch (_: Exception) {}

    // 4. getprop dhcp.wlan0.ipaddress
    try {
      val process = Runtime.getRuntime().exec(arrayOf("getprop", "dhcp.wlan0.ipaddress"))
      val line = process.inputStream.bufferedReader().readLine()?.trim()
      if (!line.isNullOrEmpty() && line != "0.0.0.0") return line
    } catch (_: Exception) {}

    return null
  }

  private fun getAdbPort(): Int {
    // 1. Standard SystemProperties via reflection (TLS & TCP dynamic ports)
    try {
      val propClass = Class.forName("android.os.SystemProperties")
      val getMethod = propClass.getMethod("get", String::class.java, String::class.java)
      val tlsPort = (getMethod.invoke(null, "service.adb.tls.port", "") as? String)?.trim()?.toIntOrNull()
      if (tlsPort != null && tlsPort > 0) return tlsPort

      val tcpPort = (getMethod.invoke(null, "service.adb.tcp.port", "") as? String)?.trim()?.toIntOrNull()
      if (tcpPort != null && tcpPort > 0) return tcpPort
    } catch (_: Exception) {}

    // 2. getprop binary command
    for (propName in listOf("service.adb.tls.port", "service.adb.tcp.port")) {
      try {
        val process = Runtime.getRuntime().exec(arrayOf("getprop", propName))
        val line = process.inputStream.bufferedReader().readLine()?.trim()
        val p = line?.toIntOrNull()
        if (p != null && p > 0) return p
      } catch (_: Exception) {}
    }

    // 3. Settings Global & Secure
    val cr = context().contentResolver
    for (k in listOf("adb_wifi_port", "adb_port")) {
      try {
        val p = Settings.Global.getInt(cr, k, -1)
        if (p > 0) return p
      } catch (_: Exception) {}
      try {
        val p = Settings.Secure.getInt(cr, k, -1)
        if (p > 0) return p
      } catch (_: Exception) {}
    }

    // 4. Fast multi-threaded localhost socket probe (scans dynamic wireless range 30000..50000)
    try {
      val foundPort = java.util.concurrent.atomic.AtomicInteger(-1)
      val threadCount = 32
      val executor = java.util.concurrent.Executors.newFixedThreadPool(threadCount)
      val ranges = listOf(35000..45000, 30000..34999, 45001..50000)

      for (range in ranges) {
        if (foundPort.get() > 0) break
        val count = range.last - range.first + 1
        val chunkSize = (count + threadCount - 1) / threadCount
        val tasks = (0 until threadCount).map { i ->
          val start = range.first + i * chunkSize
          val end = minOf(range.last, start + chunkSize - 1)
          java.util.concurrent.Callable {
            for (p in start..end) {
              if (foundPort.get() > 0) break
              var s: java.net.Socket? = null
              try {
                s = java.net.Socket()
                s.connect(java.net.InetSocketAddress("127.0.0.1", p), 15)
                foundPort.compareAndSet(-1, p)
                break
              } catch (_: Exception) {
              } finally {
                try { s?.close() } catch (_: Exception) {}
              }
            }
          }
        }
        try {
          executor.invokeAll(tasks, 350, java.util.concurrent.TimeUnit.MILLISECONDS)
        } catch (_: Exception) {}
      }
      executor.shutdown()
      val p = foundPort.get()
      if (p > 0) return p
    } catch (_: Exception) {}

    return -1
  }

  private fun getWirelessDebuggingEndpoint(): String? {
    val port = getAdbPort()
    val isEnabled = (read(wirelessKey) == "enabled") ||
        (try { Settings.Secure.getInt(context().contentResolver, "adb_wifi_enabled", 0) == 1 } catch (_: Exception) { false }) ||
        (try { Settings.Global.getInt(context().contentResolver, "adb_wifi_enabled", 0) == 1 } catch (_: Exception) { false }) ||
        (port > 0)

    if (!isEnabled) return null

    val ip = getLocalIpAddress() ?: return null
    return if (port > 0) "$ip:$port" else null
  }

  override fun definition() = ModuleDefinition {
    Name("DevToggle")

    AsyncFunction("getStatus") {
      val endpoint = getWirelessDebuggingEndpoint()
      val isWirelessActive = endpoint != null || read(wirelessKey) == "enabled"
      mapOf(
        "developerOptions" to read(developerKey),
        "usbDebugging" to read(usbKey),
        "wirelessDebugging" to (if (isWirelessActive) "enabled" else read(wirelessKey)),
        "wirelessEndpoint" to endpoint,
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
