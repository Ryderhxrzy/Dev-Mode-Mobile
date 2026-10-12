package expo.modules.devtoggle

import android.content.Context
import android.database.ContentObserver
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Handler
import android.os.Looper
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
    private val isRunning = AtomicBoolean(false)
    private var serverSocket: ServerSocket? = null
    private var udpSocket: DatagramSocket? = null
    private var nsdManager: NsdManager? = null
    private var registrationListener: NsdManager.RegistrationListener? = null
    private var contentObserver: ContentObserver? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    @Synchronized
    fun start(context: Context) {
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
    }

    private fun prefs(context: Context) = context.getSharedPreferences("devtoggle_local_prefs", Context.MODE_PRIVATE)

    /** User preference: re-enable Wireless Debugging when Wi-Fi comes back (Android turns it off on every Wi-Fi drop). */
    fun isKeepWirelessOn(context: Context): Boolean = prefs(context).getBoolean(KEY_KEEP_WIRELESS_ON, true)
    fun setKeepWirelessOn(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_KEEP_WIRELESS_ON, enabled).apply()
    }

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

            var jsonResponse = "{}"
            var statusCode = "200 OK"

            when {
                path == "/status" || path == "/api/status" -> {
                    val dev = getSetting("development_settings_enabled")
                    val usb = getSetting("adb_enabled")
                    val wifi = getSetting("adb_wifi_enabled")
                    val ip = AdbEndpointHelper.getLocalIpAddress(context) ?: ""
                    jsonResponse = """{"app":"dev-mode","developerOptions":"$dev","usbDebugging":"$usb","wirelessDebugging":"$wifi","ip":"$ip","port":$PORT}"""
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
}
