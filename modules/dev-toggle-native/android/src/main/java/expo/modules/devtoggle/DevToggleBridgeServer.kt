package expo.modules.devtoggle

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
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
    private val isRunning = AtomicBoolean(false)
    private var serverSocket: ServerSocket? = null
    private var udpSocket: DatagramSocket? = null
    private var nsdManager: NsdManager? = null
    private var registrationListener: NsdManager.RegistrationListener? = null

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
                    putSetting("development_settings_enabled", 1)
                    putSetting("adb_wifi_enabled", 1)
                    DevToggleWidgetProvider.updateAllWidgets(context)
                    DevToggleNotificationManager.updateNotification(context)
                    jsonResponse = """{"success":true,"wirelessDebugging":"enabled"}"""
                }
                path == "/api/wifi/off" || path == "/wifi/off" -> {
                    putSetting("adb_wifi_enabled", 0)
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
