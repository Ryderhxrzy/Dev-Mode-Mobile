package expo.modules.devtoggle

import android.app.ActivityManager
import android.app.ActivityOptions
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.database.ContentObserver
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.atomic.AtomicBoolean

object DevToggleBridgeServer {
    const val PORT = 52882
    private const val KEY_KEEP_WIRELESS_ON = "keep_wireless_on"
    private const val KEY_WIRELESS_WANTED = "wireless_wanted"
    // Web Remote Dashboard disabled.
    // private const val KEY_WEB_REMOTE_ENABLED = "web_remote_enabled"
    // Web Remote Dashboard disabled: private const val KEY_AUTO_WIRELESS_CONNECT = "auto_wireless_connect"
    private val isRunning = AtomicBoolean(false)
    private var serverSocket: ServerSocket? = null
    private var udpSocket: DatagramSocket? = null
    private var nsdManager: NsdManager? = null
    private var registrationListener: NsdManager.RegistrationListener? = null
    private var contentObserver: ContentObserver? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    @Synchronized
    fun start(context: Context) {
        // Always ensure ContentObserver runs so local widgets stay in sync with settings
        ensureSettingsObserver(context)

        /* Web Remote Dashboard disabled. Keep only the local settings observer above.
        if (!isWebRemoteEnabled(context)) return
        if (isRunning.get()) return
        isRunning.set(true)

        // 1. Start TCP HTTP Server Thread
        Thread {
            try {
                val server = ServerSocket(PORT)
                serverSocket = server
                while (isRunning.get()) {
                    try {
                        val client = server.accept()
                        Thread { handleClient(context, client) }.start()
                    } catch (_: Exception) {
                        if (!isRunning.get()) break
                    }
                }
            } catch (_: Exception) {
            }
        }.apply { isDaemon = true; start() }

        // 2. Start UDP Discovery Broadcast Responder
        Thread {
            try {
                val udp = DatagramSocket(PORT)
                udpSocket = udp
                val buffer = ByteArray(512)
                while (isRunning.get()) {
                    try {
                        val packet = DatagramPacket(buffer, buffer.size)
                        udp.receive(packet)
                        val msg = String(packet.data, 0, packet.length).trim()
                        if (msg.startsWith("DEVMODE_DISCOVER")) {
                            val ip = AdbEndpointHelper.getLocalIpAddress(context) ?: packet.address.hostAddress
                            val reply = "DEVMODE_PONG:$ip:$PORT\n"
                            val replyData = reply.toByteArray(Charsets.UTF_8)
                            val replyPacket = DatagramPacket(replyData, replyData.size, packet.address, packet.port)
                            udp.send(replyPacket)
                        }
                    } catch (_: Exception) {
                        if (!isRunning.get()) break
                    }
                }
            } catch (_: Exception) {
            }
        }.apply { isDaemon = true; start() }

        // 3. Register mDNS
        registerNsd(context)

        // 4. Register real-time ContentObserver for global settings
        ensureSettingsObserver(context)
        */
    }

    private fun prefs(context: Context) = context.getSharedPreferences("devtoggle_local_prefs", Context.MODE_PRIVATE)

    /** User preference: re-enable Wireless Debugging when Wi-Fi comes back (Android turns it off on every Wi-Fi drop). */
    fun isKeepWirelessOn(context: Context): Boolean = prefs(context).getBoolean(KEY_KEEP_WIRELESS_ON, true)
    fun setKeepWirelessOn(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_KEEP_WIRELESS_ON, enabled).apply()
    }

    // Web Remote Dashboard disabled.
    // fun isWebRemoteEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_WEB_REMOTE_ENABLED, false)
    // fun setWebRemoteEnabled(context: Context, enabled: Boolean) { ... }

    // Web Remote Dashboard disabled.
    // fun isAutoWirelessConnect(context: Context): Boolean = prefs(context).getBoolean(KEY_AUTO_WIRELESS_CONNECT, false)
    // fun setAutoWirelessConnect(context: Context, enabled: Boolean) { ... }

    private fun isWifiConnected(context: Context): Boolean = try {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        cm.getNetworkCapabilities(cm.activeNetwork)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    } catch (_: Exception) { false }

    private fun isAdbWifiEnabled(cr: android.content.ContentResolver): Boolean =
        (try { Settings.Global.getInt(cr, "adb_wifi_enabled", 0) == 1 } catch (_: Exception) { false }) ||
        (try { Settings.Secure.getInt(cr, "adb_wifi_enabled", 0) == 1 } catch (_: Exception) { false })

    /** Keeps widgets + notification in sync with settings changed from outside (CLI `settings put`, Settings app). Safe to call repeatedly. */
    fun ensureSettingsObserver(context: Context) {
        if (contentObserver != null) return
        val appContext = context.applicationContext
        val cr = appContext.contentResolver
        val handler = Handler(Looper.getMainLooper())
        val observer = object : ContentObserver(handler) {
            override fun onChange(selfChange: Boolean, uri: Uri?) {
                super.onChange(selfChange, uri)
                try {
                    DevToggleWidgetProvider.updateAllWidgets(appContext)
                    DevToggleNotificationManager.updateNotification(appContext)

                    val isWifiEnabled = isAdbWifiEnabled(cr)
                    if (isWifiEnabled) {
                        // Someone (user, widget, CLI) wants wireless on: remember that intent
                        prefs(appContext).edit().putBoolean(KEY_WIRELESS_WANTED, true).apply()
                    } else {
                        AdbEndpointHelper.clearPersistedEndpoint(appContext)
                        // Turned off while Wi-Fi is up = deliberate. Turned off while Wi-Fi is down = Android
                        // did it (it always disables Wireless Debugging on Wi-Fi loss); keep the intent.
                        if (isWifiConnected(appContext)) {
                            prefs(appContext).edit().putBoolean(KEY_WIRELESS_WANTED, false).apply()
                        }
                    }
                } catch (_: Exception) {}
            }
        }
        contentObserver = observer
        try {
            cr.registerContentObserver(Settings.Global.getUriFor("development_settings_enabled"), false, observer)
            cr.registerContentObserver(Settings.Global.getUriFor("adb_enabled"), false, observer)
            cr.registerContentObserver(Settings.Global.getUriFor("adb_wifi_enabled"), false, observer)
        } catch (_: Exception) {}
        registerWifiCallback(appContext)
    }

    private fun registerWifiCallback(appContext: Context) {
        if (networkCallback != null) return
        try {
            val cm = appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    // Give the framework a moment to see the new Wi-Fi (it validates the network before accepting the toggle)
                    Handler(Looper.getMainLooper()).postDelayed({ restoreWirelessIfWanted(appContext) }, 2500L)
                }
            }
            val request = NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build()
            cm.registerNetworkCallback(request, callback)
            networkCallback = callback
        } catch (_: Exception) {}
    }

    private fun restoreWirelessIfWanted(context: Context) {
        try {
            val p = prefs(context)
            if (!p.getBoolean(KEY_KEEP_WIRELESS_ON, true) || !p.getBoolean(KEY_WIRELESS_WANTED, false)) return
            val cr = context.contentResolver
            if (isAdbWifiEnabled(cr) || !isWifiConnected(context)) return
            Settings.Global.putInt(cr, "development_settings_enabled", 1)
            Settings.Global.putInt(cr, "adb_wifi_enabled", 1)
            AdbEndpointHelper.startDiscovery(context)
        } catch (_: Exception) {}
    }

    private fun registerNsd(context: Context) {
        try {
            nsdManager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager
            val serviceInfo = NsdServiceInfo().apply {
                serviceName = "DevMode-Bridge"
                serviceType = "_devmode-bridge._tcp"
                port = PORT
            }
            registrationListener = object : NsdManager.RegistrationListener {
                override fun onServiceRegistered(info: NsdServiceInfo?) {}
                override fun onRegistrationFailed(info: NsdServiceInfo?, errorCode: Int) {}
                override fun onServiceUnregistered(info: NsdServiceInfo?) {}
                override fun onUnregistrationFailed(info: NsdServiceInfo?, errorCode: Int) {}
            }
            nsdManager?.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
        } catch (_: Exception) {}
    }

    private fun handleClient(context: Context, socket: Socket) {
        try {
            socket.soTimeout = 3000
            val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
            val out = PrintWriter(socket.getOutputStream(), true)

            val requestLine = reader.readLine() ?: return
            val parts = requestLine.split(" ")
            if (parts.size < 2) return
            val method = parts[0]
            val path = parts[1]

            val cr = context.contentResolver

            fun getSetting(key: String): String = try {
                if (Settings.Global.getInt(cr, key) == 1) "enabled" else "disabled"
            } catch (_: Exception) { "unknown" }

            fun putSetting(key: String, value: Int): Boolean = try {
                Settings.Global.putInt(cr, key, value)
            } catch (_: Exception) { false }

            /* MediaProjection disabled.
            if (path == "/api/screen/stream" || path == "/screen/stream") {
                socket.soTimeout = 0
                val rawOut = socket.getOutputStream()
                if (!DevToggleScreenMirrorManager.isStreaming()) {
                    val msg = """{"error":"Screen mirroring not active. Start mirroring from mobile app first.","streaming":false}"""
                    val b = msg.toByteArray(Charsets.UTF_8)
                    rawOut.write("HTTP/1.1 503 Service Unavailable\r\nContent-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: ${b.size}\r\n\r\n".toByteArray(Charsets.US_ASCII))
                    rawOut.write(b)
                    rawOut.flush()
                } else {
                    DevToggleScreenMirrorManager.handleStreamClient(rawOut)
                }
                return
            }

            if (path == "/api/screen/frame" || path == "/screen/frame") {
                val rawOut = socket.getOutputStream()
                val jpeg = DevToggleScreenMirrorManager.getLatestJpeg()
                if (jpeg != null) {
                    rawOut.write("HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-cache, no-store, must-revalidate\r\nContent-Length: ${jpeg.size}\r\n\r\n".toByteArray(Charsets.US_ASCII))
                    rawOut.write(jpeg)
                    rawOut.flush()
                } else {
                    val msg = """{"error":"No frame available","streaming":${DevToggleScreenMirrorManager.isStreaming()}}"""
                    val b = msg.toByteArray(Charsets.UTF_8)
                    rawOut.write("HTTP/1.1 404 Not Found\r\nContent-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: ${b.size}\r\n\r\n".toByteArray(Charsets.US_ASCII))
                    rawOut.write(b)
                    rawOut.flush()
                }
                return
            }
            */

            var jsonResponse = "{}"
            var statusCode = "200 OK"

            when {
                /* MediaProjection disabled.
                path == "/api/screen/status" || path == "/screen/status" -> {
                    val streaming = DevToggleScreenMirrorManager.isStreaming()
                    val w = DevToggleScreenMirrorManager.streamWidth
                    val h = DevToggleScreenMirrorManager.streamHeight
                    val ip = AdbEndpointHelper.getLocalIpAddress(context) ?: ""
                    val isAppVd = DevToggleScreenMirrorManager.isAppVirtualDisplay
                    val dispId = DevToggleScreenMirrorManager.currentDisplayId
                    jsonResponse = """{"streaming":$streaming,"width":$w,"height":$h,"displayId":$dispId,"isAppVirtualDisplay":$isAppVd,"streamUrl":"http://$ip:$PORT/api/screen/stream"}"""
                }
                path == "/api/screen/start" -> {
                    DevToggleScreenCaptureActivity.start(context)
                    jsonResponse = """{"success":true,"message":"Screen capture request dispatched"}"""
                }
                path == "/api/screen/stop" -> {
                    DevToggleScreenCaptureActivity.stop(context)
                    jsonResponse = """{"success":true,"streaming":false}"""
                }
                path == "/api/virtual_display/start" || path.startsWith("/api/virtual_display/start?") -> {
                    val displayId = DevToggleScreenMirrorManager.startVirtualAppDisplay(context)
                    val ip = AdbEndpointHelper.getLocalIpAddress(context) ?: ""
                    jsonResponse = """{"success":${displayId > 0},"displayId":$displayId,"streamUrl":"http://$ip:$PORT/api/screen/stream"}"""
                }
                path == "/api/virtual_display/stop" -> {
                    DevToggleScreenMirrorManager.stop()
                    jsonResponse = """{"success":true,"streaming":false}"""
                }
                path.startsWith("/api/virtual_display/launch") -> {
                    val query = if (path.contains("?")) path.substringAfter("?") else ""
                    val pkg = query.split("&").find { it.startsWith("package=") }?.substringAfter("package=") ?: ""
                    val displayId = DevToggleScreenMirrorManager.currentDisplayId
                    if (pkg.isNotEmpty()) {
                        val launchIntent = context.packageManager.getLaunchIntentForPackage(pkg)?.apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_MULTIPLE_TASK)
                        }
                        if (launchIntent != null) {
                            if (displayId > 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                val opts = ActivityOptions.makeBasic().apply { setLaunchDisplayId(displayId) }
                                context.startActivity(launchIntent, opts.toBundle())
                            } else {
                                context.startActivity(launchIntent)
                            }
                            jsonResponse = """{"success":true,"package":"$pkg","displayId":$displayId}"""
                        } else {
                            jsonResponse = """{"success":false,"error":"Launch intent not found for $pkg"}"""
                        }
                    } else {
                        jsonResponse = """{"success":false,"error":"Missing package parameter"}"""
                    }
                }
                */
                path == "/api/apps" || path == "/apps" -> {
                    val pm = context.packageManager
                    val mainIntent = Intent(Intent.ACTION_MAIN, null).apply { addCategory(Intent.CATEGORY_LAUNCHER) }
                    val list = pm.queryIntentActivities(mainIntent, 0)
                    val sb = StringBuilder("[")
                    var first = true
                    for (info in list) {
                        val pkg = info.activityInfo.packageName
                        val label = info.loadLabel(pm).toString().replace("\\", "\\\\").replace("\"", "\\\"")
                        val act = info.activityInfo.name
                        if (!first) sb.append(",")
                        first = false
                        sb.append("""{"name":"$label","package":"$pkg","activity":"$act"}""")
                    }
                    sb.append("]")
                    jsonResponse = sb.toString()
                }
                path == "/status" || path == "/api/status" -> {
                    val dev = getSetting("development_settings_enabled")
                    val usb = getSetting("adb_enabled")
                    val wifi = getSetting("adb_wifi_enabled")
                    val ip = AdbEndpointHelper.getLocalIpAddress(context) ?: ""
                    jsonResponse = """{"app":"dev-mode","developerOptions":"$dev","usbDebugging":"$usb","wirelessDebugging":"$wifi","ip":"$ip","port":$PORT,"model":"${Build.MODEL}","androidVersion":"${Build.VERSION.RELEASE}","sdkInt":${Build.VERSION.SDK_INT}}"""
                }
                path == "/metrics" || path == "/api/metrics" -> {
                    jsonResponse = getPerformanceMetricsJson(context)
                }
                path == "/device/info" || path == "/api/device/info" -> {
                    jsonResponse = getDeviceInfoJson(context)
                }
                path == "/api/dev/on" || path == "/dev/on" -> {
                    putSetting("development_settings_enabled", 1)
                    DevToggleWidgetProvider.updateAllWidgets(context)
                    DevToggleNotificationManager.updateNotification(context)
                    jsonResponse = """{"success":true,"developerOptions":"enabled"}"""
                }
                path == "/api/dev/off" || path == "/dev/off" -> {
                    putSetting("development_settings_enabled", 0)
                    putSetting("adb_enabled", 0)
                    putSetting("adb_wifi_enabled", 0)
                    AdbEndpointHelper.clearPersistedEndpoint(context)
                    DevToggleWidgetProvider.updateAllWidgets(context)
                    DevToggleNotificationManager.updateNotification(context)
                    jsonResponse = """{"success":true,"developerOptions":"disabled"}"""
                }
                path == "/api/usb/on" || path == "/usb/on" -> {
                    putSetting("development_settings_enabled", 1)
                    putSetting("adb_enabled", 1)
                    DevToggleWidgetProvider.updateAllWidgets(context)
                    DevToggleNotificationManager.updateNotification(context)
                    jsonResponse = """{"success":true,"developerOptions":"enabled","usbDebugging":"enabled"}"""
                }
                path == "/api/usb/off" || path == "/usb/off" -> {
                    putSetting("adb_enabled", 0)
                    DevToggleWidgetProvider.updateAllWidgets(context)
                    DevToggleNotificationManager.updateNotification(context)
                    jsonResponse = """{"success":true,"usbDebugging":"disabled"}"""
                }
                path == "/api/wifi/on" || path == "/wifi/on" -> {
                    val wasEnabled = getSetting("adb_wifi_enabled") == "enabled"
                    putSetting("development_settings_enabled", 1)
                    putSetting("adb_wifi_enabled", 1)
                    DevToggleWidgetProvider.updateAllWidgets(context)
                    DevToggleNotificationManager.updateNotification(context)

                    // A fresh enable makes adbd pick a new TLS port: drop the old one and wait until
                    // the new listener actually accepts connections before handing it to the CLI.
                    if (!wasEnabled) AdbEndpointHelper.clearPersistedEndpoint(context)
                    AdbEndpointHelper.startDiscovery(context)
                    val ip = AdbEndpointHelper.getLocalIpAddress(context) ?: ""
                    val dynamicPort = AdbEndpointHelper.awaitLivePort(context, if (wasEnabled) 3000L else 8000L)

                    val portJson = if (dynamicPort > 0) dynamicPort.toString() else "null"
                    jsonResponse = """{"success":true,"wirelessDebugging":"enabled","ip":"$ip","port":$portJson}"""
                }
                path == "/api/wifi/port" || path == "/wifi/port" -> {
                    // Fresh, verified Wireless ADB endpoint (used by the CLI to retry a connect)
                    val enabled = getSetting("adb_wifi_enabled") == "enabled"
                    val ip = AdbEndpointHelper.getLocalIpAddress(context) ?: ""
                    val port = if (enabled) AdbEndpointHelper.getPort(context, allowStale = false) else -1
                    val portJson = if (port > 0) port.toString() else "null"
                    jsonResponse = """{"wirelessDebugging":"${if (enabled) "enabled" else "disabled"}","ip":"$ip","port":$portJson}"""
                }
                path == "/api/wifi/off" || path == "/wifi/off" -> {
                    putSetting("adb_wifi_enabled", 0)
                    AdbEndpointHelper.clearPersistedEndpoint(context)
                    DevToggleWidgetProvider.updateAllWidgets(context)
                    DevToggleNotificationManager.updateNotification(context)
                    jsonResponse = """{"success":true,"wirelessDebugging":"disabled"}"""
                }
                else -> {
                    statusCode = "404 Not Found"
                    jsonResponse = """{"error":"Not Found"}"""
                }
            }

            val bodyBytes = jsonResponse.toByteArray(Charsets.UTF_8)
            out.print("HTTP/1.1 $statusCode\r\n")
            out.print("Content-Type: application/json; charset=utf-8\r\n")
            out.print("Content-Length: ${bodyBytes.size}\r\n")
            out.print("Access-Control-Allow-Origin: *\r\n")
            out.print("Connection: close\r\n\r\n")
            out.flush()
            socket.getOutputStream().write(bodyBytes)
            socket.getOutputStream().flush()
        } catch (_: Exception) {
        } finally {
            try { socket.close() } catch (_: Exception) {}
        }
    }

    @Synchronized
    fun stop() {
        isRunning.set(false)
        try { serverSocket?.close() } catch (_: Exception) {}
        try { udpSocket?.close() } catch (_: Exception) {}
        try {
            registrationListener?.let { nsdManager?.unregisterService(it) }
        } catch (_: Exception) {}
        serverSocket = null
        udpSocket = null
        nsdManager = null
        registrationListener = null
    }

    fun getDeviceInfoJson(context: Context): String {
        val ip = AdbEndpointHelper.getLocalIpAddress(context) ?: ""
        return """{"model":"${Build.MODEL}","manufacturer":"${Build.MANUFACTURER}","brand":"${Build.BRAND}","androidVersion":"${Build.VERSION.RELEASE}","sdkInt":${Build.VERSION.SDK_INT},"ip":"$ip","port":$PORT}"""
    }

    fun getPerformanceMetricsJson(context: Context): String {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        am?.getMemoryInfo(memInfo)
        val totalMb = ((memInfo.totalMem) / (1024 * 1024)).toInt()
        val availMb = ((memInfo.availMem) / (1024 * 1024)).toInt()
        val usedMb = totalMb - availMb
        val ramPct = if (totalMb > 0) ((usedMb.toDouble() / totalMb) * 100).toInt() else 0

        val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { filter ->
            context.registerReceiver(null, filter)
        }
        val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val batteryPct = if (level >= 0 && scale > 0) ((level.toFloat() / scale.toFloat()) * 100).toInt() else 0
        val tempInt = batteryStatus?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) ?: 0
        val tempC = tempInt / 10.0f
        val voltageMv = batteryStatus?.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0) ?: 0
        val bStatus = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = bStatus == BatteryManager.BATTERY_STATUS_CHARGING || bStatus == BatteryManager.BATTERY_STATUS_FULL
        val chargePlug = batteryStatus?.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1) ?: -1
        val pluggedStr = when (chargePlug) {
            BatteryManager.BATTERY_PLUGGED_USB -> "USB"
            BatteryManager.BATTERY_PLUGGED_AC -> "AC"
            BatteryManager.BATTERY_PLUGGED_WIRELESS -> "Wireless"
            else -> "Battery"
        }
        val healthInt = batteryStatus?.getIntExtra(BatteryManager.EXTRA_HEALTH, BatteryManager.BATTERY_HEALTH_UNKNOWN) ?: BatteryManager.BATTERY_HEALTH_UNKNOWN
        val healthStr = when (healthInt) {
            BatteryManager.BATTERY_HEALTH_GOOD -> "Good"
            BatteryManager.BATTERY_HEALTH_OVERHEAT -> "Overheat"
            BatteryManager.BATTERY_HEALTH_DEAD -> "Dead"
            BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "Over Voltage"
            else -> "Normal"
        }

        val cores = Runtime.getRuntime().availableProcessors()

        val thermalStatusStr = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                when (pm?.currentThermalStatus) {
                    PowerManager.THERMAL_STATUS_NONE -> "Nominal"
                    PowerManager.THERMAL_STATUS_LIGHT -> "Light"
                    PowerManager.THERMAL_STATUS_MODERATE -> "Moderate"
                    PowerManager.THERMAL_STATUS_SEVERE -> "Severe"
                    PowerManager.THERMAL_STATUS_CRITICAL -> "Critical"
                    PowerManager.THERMAL_STATUS_EMERGENCY -> "Emergency"
                    PowerManager.THERMAL_STATUS_SHUTDOWN -> "Shutdown"
                    else -> "Normal"
                }
            } catch (_: Exception) { "Normal" }
        } else {
            "Normal"
        }

        return """{"cpu":{"cores":$cores},"ram":{"totalMb":$totalMb,"usedMb":$usedMb,"availableMb":$availMb,"percentage":$ramPct},"battery":{"level":$batteryPct,"temperature":$tempC,"voltage":$voltageMv,"isCharging":$isCharging,"plugged":"$pluggedStr","health":"$healthStr"},"thermal":{"status":"$thermalStatusStr"}}"""
    }
}
