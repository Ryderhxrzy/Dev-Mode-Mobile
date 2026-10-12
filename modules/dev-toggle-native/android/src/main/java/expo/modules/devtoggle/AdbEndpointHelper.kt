package expo.modules.devtoggle

import android.content.Context
import android.content.SharedPreferences
import android.net.ConnectivityManager
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket
import java.util.Collections
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

object AdbEndpointHelper {
    private const val PREFS_NAME = "devtoggle_local_prefs"
    private const val KEY_PERSISTED_PORT = "adb_persisted_port"
    private const val KEY_PERSISTED_IP = "adb_persisted_ip"
    private const val KEY_PERSISTED_ENDPOINT = "adb_persisted_endpoint"

    @Volatile var cachedPort: Int = -1
    @Volatile var cachedIp: String? = null
    private val isDiscovering = AtomicBoolean(false)
    private val isResolving = AtomicBoolean(false)
    private var nsdManager: NsdManager? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null
    private var multicastLock: WifiManager.MulticastLock? = null

    private fun getPrefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getPersistedPort(context: Context): Int =
        getPrefs(context).getInt(KEY_PERSISTED_PORT, -1)

    fun savePersistedEndpoint(context: Context, ip: String, port: Int) {
        if (port > 0 && ip.isNotBlank()) {
            cachedPort = port
            cachedIp = ip
            getPrefs(context).edit()
                .putInt(KEY_PERSISTED_PORT, port)
                .putString(KEY_PERSISTED_IP, ip)
                .putString(KEY_PERSISTED_ENDPOINT, "$ip:$port")
                .apply()
        }
    }

    fun clearPersistedEndpoint(context: Context) {
        cachedPort = -1
        cachedIp = null
        getPrefs(context).edit()
            .remove(KEY_PERSISTED_PORT)
            .remove(KEY_PERSISTED_IP)
            .remove(KEY_PERSISTED_ENDPOINT)
            .apply()
    }

    fun getLocalIpAddress(context: Context): String? {
        // 1. ConnectivityManager (Active network IPv4)
        try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            val activeNet = cm?.activeNetwork
            if (activeNet != null) {
                val lp = cm.getLinkProperties(activeNet)
                val ip = lp?.linkAddresses?.firstOrNull { it.address is Inet4Address && !it.address.isLoopbackAddress }?.address?.hostAddress
                if (!ip.isNullOrEmpty() && ip != "0.0.0.0") return ip
            }
        } catch (_: Exception) {}

        // 2. WifiManager (Wi-Fi connection IP)
        try {
            val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val ipInt = wm?.connectionInfo?.ipAddress ?: 0
            if (ipInt != 0) {
                val ip = String.format(Locale.US, "%d.%d.%d.%d", ipInt and 0xff, ipInt shr 8 and 0xff, ipInt shr 16 and 0xff, ipInt shr 24 and 0xff)
                if (ip != "0.0.0.0") return ip
            }
        } catch (_: Exception) {}

        // 3. NetworkInterface prioritization (wlan0, wifi0, etc.)
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces.filter { it.name.startsWith("wlan", true) || it.name.startsWith("wifi", true) }) {
                for (addr in Collections.list(intf.inetAddresses)) {
                    if (!addr.isLoopbackAddress && addr is Inet4Address && !addr.isLinkLocalAddress) {
                        val host = addr.hostAddress
                        if (!host.isNullOrEmpty() && host != "0.0.0.0") return host
                    }
                }
            }
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

        // 5. Outbound UDP routing interface (instant, 0 packets sent)
        try {
            java.net.DatagramSocket().use { socket ->
                socket.connect(java.net.InetAddress.getByName("8.8.8.8"), 53)
                val ip = socket.localAddress?.hostAddress
                if (!ip.isNullOrBlank() && ip != "0.0.0.0" && !ip.startsWith(":") && !ip.startsWith("127.")) {
                    return ip
                }
            }
        } catch (_: Exception) {}

        return null
    }

    private fun readSystemProperty(key: String): String? {
        // Reflection on android.os.SystemProperties
        try {
            val propClass = Class.forName("android.os.SystemProperties")
            val getMethod = propClass.getMethod("get", String::class.java, String::class.java)
            val value = (getMethod.invoke(null, key, "") as? String)?.trim()
            if (!value.isNullOrBlank()) return value
        } catch (_: Exception) {}

        // Fallback to getprop command
        try {
            val process = Runtime.getRuntime().exec(arrayOf("getprop", key))
            val line = process.inputStream.bufferedReader().readLine()?.trim()
            if (!line.isNullOrBlank()) return line
        } catch (_: Exception) {}

        return null
    }

    fun startDiscovery(context: Context) {
        try {
            val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            if (wm != null && (multicastLock == null || !multicastLock!!.isHeld)) {
                multicastLock = wm.createMulticastLock("DevToggleMulticastLock").apply {
                    setReferenceCounted(true)
                    acquire()
                }
            }
        } catch (_: Exception) {}

        try {
            if (isDiscovering.get()) return
            val nsd = context.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
            nsdManager = nsd

            discoveryListener = object : NsdManager.DiscoveryListener {
                override fun onDiscoveryStarted(regType: String) {
                    isDiscovering.set(true)
                }

                override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                    val type = serviceInfo.serviceType ?: ""
                    val name = serviceInfo.serviceName ?: ""
                    // Skip pairing advertisements
                    if (type.contains("pairing", true) || name.contains("pairing", true)) return

                    if (type.contains("adb", true) || name.contains("adb", true)) {
                        resolveWithRetry(nsd, serviceInfo, attempt = 0)
                    }
                }

                // onServiceFound fires once per service, and NsdManager allows only one resolve at a
                // time (FAILURE_ALREADY_ACTIVE). Dropping it meant the port was never learned and the
                // UI stayed on "Resolving..."; retry a few times instead.
                private fun resolveWithRetry(nsd: NsdManager, serviceInfo: NsdServiceInfo, attempt: Int) {
                    if (attempt > 6) return
                    val retry = { Handler(Looper.getMainLooper()).postDelayed({ resolveWithRetry(nsd, serviceInfo, attempt + 1) }, 600L) }
                    if (!isResolving.compareAndSet(false, true)) { retry(); return }
                    try {
                        nsd.resolveService(serviceInfo, object : NsdManager.ResolveListener {
                            override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                                isResolving.set(false)
                                retry()
                            }

                            override fun onServiceResolved(resolved: NsdServiceInfo) {
                                try {
                                    val host = resolved.host
                                    val h = host?.hostAddress
                                    val localIp = getLocalIpAddress(context)
                                    // Another phone on the same Wi-Fi also advertises _adb-tls-connect. Reject only a
                                    // clearly foreign IPv4; IPv6/link-local/unknown hosts are treated as our own.
                                    val isForeign = host is Inet4Address && !h.isNullOrEmpty() &&
                                        h != "0.0.0.0" && localIp != null && h != localIp && !host.isLoopbackAddress
                                    if (resolved.port > 0 && !isForeign) {
                                        cachedPort = resolved.port
                                        val currentIp = if (host is Inet4Address && !h.isNullOrEmpty() && h != "0.0.0.0" && !host.isLoopbackAddress) h else localIp
                                        if (!currentIp.isNullOrBlank()) {
                                            cachedIp = currentIp
                                            savePersistedEndpoint(context, currentIp, resolved.port)
                                        }
                                        // Real-time update to widgets and notifications as soon as resolved
                                        try {
                                            DevToggleWidgetProvider.updateAllWidgets(context)
                                            DevToggleNotificationManager.updateNotification(context)
                                        } catch (_: Exception) {}
                                    }
                                } finally {
                                    isResolving.set(false)
                                }
                            }
                        })
                    } catch (_: Exception) {
                        isResolving.set(false)
                        retry()
                    }
                }

                override fun onServiceLost(serviceInfo: NsdServiceInfo) {}
                override fun onDiscoveryStopped(serviceType: String) { isDiscovering.set(false) }
                override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) { isDiscovering.set(false) }
                override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) { isDiscovering.set(false) }
            }

            nsd.discoverServices("_adb-tls-connect._tcp", NsdManager.PROTOCOL_DNS_SD, discoveryListener)
        } catch (_: Exception) {
            isDiscovering.set(false)
        }
    }

    fun stopDiscovery() {
        try {
            if (multicastLock != null && multicastLock!!.isHeld) {
                multicastLock?.release()
            }
        } catch (_: Exception) {}
        try {
            if (isDiscovering.get() && nsdManager != null && discoveryListener != null) {
                nsdManager?.stopServiceDiscovery(discoveryListener)
                isDiscovering.set(false)
            }
        } catch (_: Exception) {}
    }

    /**
     * True when adbd is actually accepting TCP connections on [port]. The system property is set
     * the moment adbd starts, slightly before the TLS listener is ready, and OEM settings keys can
     * hold a port from a previous session; a loopback connect is the only reliable check.
     * Network calls are not allowed on the main thread (widgets), so there we trust the source.
     */
    fun isPortLive(port: Int, timeoutMs: Int = 200): Boolean {
        if (port !in 1..65535) return false
        if (Looper.myLooper() == Looper.getMainLooper()) return true
        return try {
            Socket().use { it.connect(InetSocketAddress("127.0.0.1", port), timeoutMs) }
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Poll until a Wireless ADB port exists AND accepts connections, or [timeoutMs] elapses
     * (adbd starts its TLS listener asynchronously). Best effort: if a port is known but the
     * loopback probe never passes before the deadline, return it anyway; the CLI verifies via mDNS
     * and retries, so a late port beats no port.
     */
    fun awaitLivePort(context: Context, timeoutMs: Long): Int {
        val deadline = System.currentTimeMillis() + timeoutMs
        var lastKnown = -1
        while (true) {
            val port = getPort(context, allowStale = false)
            if (port > 0) {
                lastKnown = port
                if (isPortLive(port)) return port
            }
            if (System.currentTimeMillis() >= deadline) return lastKnown
            try { Thread.sleep(150) } catch (_: Exception) {}
        }
    }

    fun getPort(context: Context, allowStale: Boolean = true): Int {
        val isAndroid11Plus = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R

        // Invalidate stale 5555 on Android 11+
        if (isAndroid11Plus && cachedPort == 5555) {
            cachedPort = -1
        }

        // Valid dynamic port (liveness is gated separately in awaitLivePort so the UI never blanks out)
        fun usable(p: Int): Boolean = p in 1024..65535 && (!isAndroid11Plus || p != 5555)

        // 1. Direct System Property: service.adb.tls.port (Set directly by adbd upon starting TLS)
        val tlsPort = readSystemProperty("service.adb.tls.port")?.toIntOrNull()
        if (tlsPort != null && usable(tlsPort)) {
            cachedPort = tlsPort
            return tlsPort
        }

        // 2. Settings Global & Secure: adb_wifi_port / adb_port (only if valid dynamic port on Android 11+)
        val cr = context.contentResolver
        for (k in listOf("adb_wifi_port", "adb_port")) {
            val p1 = try { Settings.Global.getInt(cr, k, -1) } catch (_: Exception) { -1 }
            if (usable(p1)) {
                cachedPort = p1
                return p1
            }
            val p2 = try { Settings.Secure.getInt(cr, k, -1) } catch (_: Exception) { -1 }
            if (usable(p2)) {
                cachedPort = p2
                return p2
            }
        }

        // 3. In-memory cached port if valid dynamic port (only if allowStale)
        if (allowStale && usable(cachedPort)) {
            return cachedPort
        }

        // 4. Trigger mDNS discovery in background
        startDiscovery(context)
        val maxWait = if (allowStale) 600 else 1200
        var waited = 0
        while (waited < maxWait && (cachedPort <= 0 || (isAndroid11Plus && cachedPort == 5555))) {
            try { Thread.sleep(50) } catch (_: Exception) {}
            waited += 50
        }

        if (usable(cachedPort)) {
            return cachedPort
        }

        // 5. Persisted Port in SharedPreferences (ONLY if allowStale and not 5555 on Android 11+)
        if (allowStale) {
            val persisted = getPersistedPort(context)
            if (usable(persisted)) {
                cachedPort = persisted
                return persisted
            }
        }

        // 6. Classic legacy tcp port (5555) ONLY for older Android (< API 30)
        if (!isAndroid11Plus) {
            val tcpPort = readSystemProperty("service.adb.tcp.port")?.toIntOrNull()
            if (tcpPort != null && tcpPort in 1..65535) {
                cachedPort = tcpPort
                return tcpPort
            }
        }

        return -1
    }

    fun getEndpoint(context: Context): String? {
        val cr = context.contentResolver
        val isEnabled = (try { Settings.Global.getInt(cr, "adb_wifi_enabled", 0) == 1 } catch (_: Exception) { false }) ||
            (try { Settings.Secure.getInt(cr, "adb_wifi_enabled", 0) == 1 } catch (_: Exception) { false })

        if (!isEnabled) {
            stopDiscovery()
            clearPersistedEndpoint(context)
            return null
        }

        val rawIp = if (!cachedIp.isNullOrBlank() && !cachedIp!!.startsWith(":") && cachedIp != "0.0.0.0") {
            cachedIp
        } else {
            getLocalIpAddress(context)
        }
        val ip = if (!rawIp.isNullOrBlank() && !rawIp.startsWith(":") && rawIp != "0.0.0.0") rawIp else null

        val isAndroid11Plus = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
        val port = getPort(context)

        // 1. Both IP and Port are active
        if (ip != null && port in 1024..65535 && (!isAndroid11Plus || port != 5555)) {
            savePersistedEndpoint(context, ip, port)
            return "$ip:$port"
        }

        // 2. Persisted session fallback (only if valid dynamic port on Android 11+)
        val persistedPort = getPersistedPort(context)
        if (ip != null && persistedPort in 1024..65535 && (!isAndroid11Plus || persistedPort != 5555)) {
            return "$ip:$persistedPort"
        }

        val persistedEp = getPrefs(context).getString(KEY_PERSISTED_ENDPOINT, null)
        if (!persistedEp.isNullOrBlank() && persistedEp.contains(":") && !persistedEp.startsWith(":") && (!isAndroid11Plus || !persistedEp.endsWith(":5555"))) {
            return persistedEp
        }

        // 3. IP is active but port is still discovering
        if (ip != null) {
            startDiscovery(context)
            return "$ip (Resolving...)"
        }

        return null
    }
}
