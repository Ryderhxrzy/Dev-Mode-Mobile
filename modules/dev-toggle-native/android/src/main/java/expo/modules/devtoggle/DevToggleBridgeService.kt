package expo.modules.devtoggle

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

/**
 * Android Foreground Service for Dev Mode.
 * Holds WifiLock and partial WakeLock to keep the local Wi-Fi bridge active
 * even when the screen is locked or the app is in the background.
 */
class DevToggleBridgeService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null

    override fun onCreate() {
        super.onCreate()
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "DevMode::BridgeWakeLock")?.apply {
                acquire(24 * 60 * 60 * 1000L) // 24 hours max
            }
            val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            wifiLock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                wm?.createWifiLock(WifiManager.WIFI_MODE_FULL_LOW_LATENCY, "DevMode::BridgeWifiLock")
            } else {
                @Suppress("DEPRECATION")
                wm?.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "DevMode::BridgeWifiLock")
            }
            wifiLock?.acquire()
        } catch (_: Exception) {}

        DevToggleBridgeServer.start(applicationContext)
        if (AppShieldManager.isEnabled(applicationContext)) {
            AppShieldManager.startMonitoring(applicationContext)
        }
    }

    companion object {
        const val ACTION_START_MEDIA_PROJECTION = "expo.modules.devtoggle.START_MEDIA_PROJECTION"
        const val ACTION_STOP_MEDIA_PROJECTION = "expo.modules.devtoggle.STOP_MEDIA_PROJECTION"
        const val EXTRA_RESULT_CODE = "extra_result_code"
        const val EXTRA_DATA_INTENT = "extra_data_intent"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action

        if (action == ACTION_START_MEDIA_PROJECTION) {
            val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0)
            @Suppress("DEPRECATION")
            val dataIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(EXTRA_DATA_INTENT, Intent::class.java)
            } else {
                intent.getParcelableExtra(EXTRA_DATA_INTENT)
            }

            try {
                val notification = DevToggleNotificationManager.buildMirrorServiceNotification(this)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE or
                            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                    startForeground(DevToggleNotificationManager.NOTIFICATION_ID, notification, serviceType)
                } else {
                    startForeground(DevToggleNotificationManager.NOTIFICATION_ID, notification)
                }
            } catch (_: Exception) {}

            if (resultCode != 0 && dataIntent != null) {
                DevToggleScreenMirrorManager.start(this, resultCode, dataIntent)
            }
        } else if (action == ACTION_STOP_MEDIA_PROJECTION) {
            DevToggleScreenMirrorManager.stop()
            try {
                val notification: Notification? = DevToggleNotificationManager.buildNotification(this)
                if (notification != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        startForeground(
                            DevToggleNotificationManager.NOTIFICATION_ID,
                            notification,
                            ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
                        )
                    } else {
                        startForeground(DevToggleNotificationManager.NOTIFICATION_ID, notification)
                    }
                } else {
                    @Suppress("DEPRECATION")
                    stopForeground(true)
                }
            } catch (_: Exception) {}
        } else {
            try {
                val notification: Notification? = DevToggleNotificationManager.buildNotification(this)
                if (notification != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        startForeground(
                            DevToggleNotificationManager.NOTIFICATION_ID,
                            notification,
                            ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
                        )
                    } else {
                        startForeground(DevToggleNotificationManager.NOTIFICATION_ID, notification)
                    }
                }
            } catch (_: Exception) {}
        }

        DevToggleBridgeServer.start(applicationContext)
        return START_STICKY
    }

    override fun onDestroy() {
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
            if (wifiLock?.isHeld == true) wifiLock?.release()
        } catch (_: Exception) {}
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

