package expo.modules.devtoggle

import android.content.Context
import android.net.ConnectivityManager
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.provider.Settings
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket
import java.util.Collections
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

object AdbEndpointHelper {
    @Volatile var cachedPort: Int = -1
    @Volatile var cachedIp: String? = null
    private val isDiscovering = AtomicBoolean(false)
    private val isResolving = AtomicBoolean(false)
    private var nsdManager: NsdManager? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null

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

        // 3. NetworkInterface prioritization
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

        // 5. Outbound UDP routing interface (instant, 0 network packets, highly reliable on Android)
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

    private fun isPortOpen(host: String, port: Int, timeoutMs: Int = 80): Boolean {
        var s: Socket? = null
        return try {
            s = Socket()
            s.connect(InetSocketAddress(host, port), timeoutMs)
            true
        } catch (_: Exception) {
            false
        } finally {
            try { s?.close() } catch (_: Exception) {}
        }
    }

    fun startDiscovery(context: Context) {
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
                    if (type.contains("adb", true) || serviceInfo.serviceName.contains("adb", true)) {
                        if (isResolving.compareAndSet(false, true)) {
                            try {
                                nsd.resolveService(serviceInfo, object : NsdManager.ResolveListener {
                                    override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                                        isResolving.set(false)
                                    }

                                    override fun onServiceResolved(resolved: NsdServiceInfo) {
                                        try {
                                            if (resolved.port > 0) {
                                                cachedPort = resolved.port
                                                val h = resolved.host?.hostAddress
                                                if (!h.isNullOrEmpty() && h != "0.0.0.0") {
                                                    cachedIp = h
                                                }
                                            }
                                        } finally {
                                            isResolving.set(false)
                                        }
                                    }
                                })
                            } catch (_: Exception) {
                                isResolving.set(false)
                            }
                        }
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
            if (isDiscovering.get() && nsdManager != null && discoveryListener != null) {
                nsdManager?.stopServiceDiscovery(discoveryListener)
                isDiscovering.set(false)
            }
        } catch (_: Exception) {}
    }

    fun getPort(context: Context): Int {
        // 0. Cached port check
        if (cachedPort > 0) {
            if (isPortOpen("127.0.0.1", cachedPort, 80)) return cachedPort
            val ip = getLocalIpAddress(context)
            if (ip != null && isPortOpen(ip, cachedPort, 80)) return cachedPort
        }

        // 1. Direct standard port 5555
        if (isPortOpen("127.0.0.1", 5555, 60)) {
            cachedPort = 5555
            return 5555
        }

        // 2. SystemProperties
        try {
            val propClass = Class.forName("android.os.SystemProperties")
            val getMethod = propClass.getMethod("get", String::class.java, String::class.java)
            val tlsPort = (getMethod.invoke(null, "service.adb.tls.port", "") as? String)?.trim()?.toIntOrNull()
            if (tlsPort != null && tlsPort > 0) {
                cachedPort = tlsPort
                return tlsPort
            }

            val tcpPort = (getMethod.invoke(null, "service.adb.tcp.port", "") as? String)?.trim()?.toIntOrNull()
            if (tcpPort != null && tcpPort > 0) {
                cachedPort = tcpPort
                return tcpPort
            }
        } catch (_: Exception) {}

        // 3. getprop binary command
        for (propName in listOf("service.adb.tls.port", "service.adb.tcp.port")) {
            try {
                val process = Runtime.getRuntime().exec(arrayOf("getprop", propName))
                val line = process.inputStream.bufferedReader().readLine()?.trim()
                val p = line?.toIntOrNull()
                if (p != null && p > 0) {
                    cachedPort = p
                    return p
                }
            } catch (_: Exception) {}
        }

        // 4. Settings Global & Secure
        val cr = context.contentResolver
        for (k in listOf("adb_wifi_port", "adb_port")) {
            try {
                val p = Settings.Global.getInt(cr, k, -1)
                if (p > 0) { cachedPort = p; return p }
            } catch (_: Exception) {}
            try {
                val p = Settings.Secure.getInt(cr, k, -1)
                if (p > 0) { cachedPort = p; return p }
            } catch (_: Exception) {}
        }

        // 5. Trigger mDNS discovery
        startDiscovery(context)
        if (cachedPort <= 0) {
            var waited = 0
            while (waited < 350 && cachedPort <= 0) {
                try { Thread.sleep(50) } catch (_: Exception) {}
                waited += 50
            }
        }

        return cachedPort
    }

    fun getEndpoint(context: Context): String? {
        val cr = context.contentResolver
        val isEnabled = (try { Settings.Global.getInt(cr, "adb_wifi_enabled", 0) == 1 } catch (_: Exception) { false }) ||
            (try { Settings.Secure.getInt(cr, "adb_wifi_enabled", 0) == 1 } catch (_: Exception) { false })

        if (!isEnabled) {
            stopDiscovery()
            cachedPort = -1
            cachedIp = null
            return null
        }

        startDiscovery(context)
        val port = getPort(context)
        val rawIp = if (!cachedIp.isNullOrBlank() && !cachedIp!!.startsWith(":") && cachedIp != "0.0.0.0") {
            cachedIp
        } else {
            getLocalIpAddress(context)
        }

        val ip = if (!rawIp.isNullOrBlank() && !rawIp.startsWith(":") && rawIp != "0.0.0.0") rawIp else null

        return if (ip != null && port > 0) {
            "$ip:$port"
        } else if (ip != null) {
            ip
        } else if (port > 0) {
            "Port: $port"
        } else {
            null
        }
    }
}

