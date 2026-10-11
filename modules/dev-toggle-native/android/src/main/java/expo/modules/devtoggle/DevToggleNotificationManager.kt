package expo.modules.devtoggle

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.provider.Settings
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat

object DevToggleNotificationManager {
    const val CHANNEL_ID = "dev_toggle_status_channel"
    const val NOTIFICATION_ID = 8842

    private const val PREFS_NAME = "devtoggle_local_prefs"
    private const val KEY_NOTIFICATION_MODE = "notification_mode" // "always", "when_dev_active", "disabled"

    private fun getPrefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getNotificationMode(context: Context): String =
        getPrefs(context).getString(KEY_NOTIFICATION_MODE, "disabled") ?: "disabled"

    fun setNotificationMode(context: Context, mode: String) {
        getPrefs(context).edit().putString(KEY_NOTIFICATION_MODE, mode).apply()
        updateNotification(context)
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Dev Mode Status & Quick Controls"
            val descriptionText = "Displays ongoing Developer Options, USB ADB, and Wireless Debugging status with quick toggles."
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
            }
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.createNotificationChannel(channel)
        }
    }

    fun buildNotification(context: Context): Notification? {
        try {
            val mode = getNotificationMode(context)
            if (mode == "disabled") return null

            // Android 13+ permission check
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    return null
                }
            }

            val cr = context.contentResolver
            val devOn = (try { Settings.Global.getInt(cr, "development_settings_enabled", 0) == 1 } catch (_: Exception) { false }) ||
                        (try { Settings.Secure.getInt(cr, "development_settings_enabled", 0) == 1 } catch (_: Exception) { false })

            if (mode == "when_dev_active" && !devOn) {
                return null
            }

            val usbOn = (try { Settings.Global.getInt(cr, "adb_enabled", 0) == 1 } catch (_: Exception) { false }) ||
                        (try { Settings.Secure.getInt(cr, "adb_enabled", 0) == 1 } catch (_: Exception) { false })

            val wirelessOn = (try { Settings.Global.getInt(cr, "adb_wifi_enabled", 0) == 1 } catch (_: Exception) { false }) ||
                             (try { Settings.Secure.getInt(cr, "adb_wifi_enabled", 0) == 1 } catch (_: Exception) { false })

            createNotificationChannel(context)

            // Content Intent -> Tap opens Main Activity
            val mainIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent()
            mainIntent.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            val piMain = PendingIntent.getActivity(
                context,
                100,
                mainIntent,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
            )

            // Quick Actions: Tapping triggers WidgetActionActivity invisibly
            val piDev = DevToggleWidgetProvider.getPendingIntent(context, DevToggleWidgetProvider.ACTION_TOGGLE_DEV, 111)
            val piUsb = DevToggleWidgetProvider.getPendingIntent(context, DevToggleWidgetProvider.ACTION_TOGGLE_USB, 112)
            val piWireless = DevToggleWidgetProvider.getPendingIntent(context, DevToggleWidgetProvider.ACTION_TOGGLE_WIRELESS, 113)

            val usbText = if (usbOn) "ON" else "OFF"
            val wirelessEndpoint = if (wirelessOn) AdbEndpointHelper.getEndpoint(context) else null
            val wirelessText = if (wirelessOn) {
                if (!wirelessEndpoint.isNullOrBlank() && wirelessEndpoint.contains(":") && !wirelessEndpoint.contains("Resolving")) {
                    wirelessEndpoint
                } else if (!wirelessEndpoint.isNullOrBlank() && wirelessEndpoint.contains("Resolving")) {
                    "CONNECTING..."
                } else {
                    "ON"
                }
            } else {
                "OFF"
            }

            val colorActiveText = Color.parseColor("#FFFFFF")
            val colorInactiveText = Color.parseColor("#7A9988")
            val colorActiveStatus = Color.parseColor("#4ADE80")
            val colorInactiveStatus = Color.parseColor("#5C7A6B")

            val devBg = if (devOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            val devIconRes = if (devOn) R.drawable.white_icon else R.drawable.widget_icon_off
            val devStatusText = if (devOn) "ON" else "OFF"

            val usbBg = if (usbOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            val wirelessBg = if (wirelessOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive

            // 1. Compact Custom RemoteViews
            val compactViews = RemoteViews(context.packageName, R.layout.notification_dev_toggle)
            compactViews.setInt(R.id.notif_btn_dev, "setBackgroundResource", devBg)
            compactViews.setTextColor(R.id.tv_notif_dev, if (devOn) colorActiveText else colorInactiveText)
            compactViews.setTextViewText(R.id.tv_notif_dev_status, devStatusText)
            compactViews.setTextColor(R.id.tv_notif_dev_status, if (devOn) colorActiveStatus else colorInactiveStatus)
            compactViews.setImageViewResource(R.id.iv_notif_dev, devIconRes)
            compactViews.setOnClickPendingIntent(R.id.notif_btn_dev, piDev)

            compactViews.setInt(R.id.notif_btn_usb, "setBackgroundResource", usbBg)
            compactViews.setTextColor(R.id.tv_notif_usb, if (usbOn) colorActiveText else colorInactiveText)
            compactViews.setTextViewText(R.id.tv_notif_usb_status, usbText)
            compactViews.setTextColor(R.id.tv_notif_usb_status, if (usbOn) colorActiveStatus else colorInactiveStatus)
            compactViews.setOnClickPendingIntent(R.id.notif_btn_usb, piUsb)

            compactViews.setInt(R.id.notif_btn_wireless, "setBackgroundResource", wirelessBg)
            compactViews.setTextColor(R.id.tv_notif_wifi, if (wirelessOn) colorActiveText else colorInactiveText)
            compactViews.setTextViewText(R.id.tv_notif_wifi_status, wirelessText)
            compactViews.setTextColor(R.id.tv_notif_wifi_status, if (wirelessOn) colorActiveStatus else colorInactiveStatus)
            compactViews.setOnClickPendingIntent(R.id.notif_btn_wireless, piWireless)

            compactViews.setOnClickPendingIntent(R.id.notif_root, piMain)

            // 2. Expanded Custom RemoteViews
            val expandedViews = RemoteViews(context.packageName, R.layout.notification_dev_toggle_expanded)
            expandedViews.setInt(R.id.notif_btn_dev, "setBackgroundResource", devBg)
            expandedViews.setTextColor(R.id.tv_notif_dev, if (devOn) colorActiveText else colorInactiveText)
            expandedViews.setTextViewText(R.id.tv_notif_dev_status, devStatusText)
            expandedViews.setTextColor(R.id.tv_notif_dev_status, if (devOn) colorActiveStatus else colorInactiveStatus)
            expandedViews.setImageViewResource(R.id.iv_notif_dev, devIconRes)
            expandedViews.setOnClickPendingIntent(R.id.notif_btn_dev, piDev)

            expandedViews.setInt(R.id.notif_btn_usb, "setBackgroundResource", usbBg)
            expandedViews.setTextColor(R.id.tv_notif_usb, if (usbOn) colorActiveText else colorInactiveText)
            expandedViews.setTextViewText(R.id.tv_notif_usb_status, usbText)
            expandedViews.setTextColor(R.id.tv_notif_usb_status, if (usbOn) colorActiveStatus else colorInactiveStatus)
            expandedViews.setOnClickPendingIntent(R.id.notif_btn_usb, piUsb)

            expandedViews.setInt(R.id.notif_btn_wireless, "setBackgroundResource", wirelessBg)
            expandedViews.setTextColor(R.id.tv_notif_wifi, if (wirelessOn) colorActiveText else colorInactiveText)
            expandedViews.setTextViewText(R.id.tv_notif_wifi_status, wirelessText)
            expandedViews.setTextColor(R.id.tv_notif_wifi_status, if (wirelessOn) colorActiveStatus else colorInactiveStatus)
            expandedViews.setOnClickPendingIntent(R.id.notif_btn_wireless, piWireless)

            // Footer
            if (wirelessOn && !wirelessEndpoint.isNullOrBlank()) {
                expandedViews.setTextViewText(R.id.tv_notif_footer, "Socket: $wirelessEndpoint • Tap chips to toggle")
            } else {
                expandedViews.setTextViewText(R.id.tv_notif_footer, "Tap buttons to toggle • Tap header to open Dev Mode")
            }

            expandedViews.setOnClickPendingIntent(R.id.notif_root, piMain)

            val title = if (devOn) "Developer Mode: Active" else "Developer Mode: Disabled"
            val summary = "USB ADB: $usbText  •  Wireless: $wirelessText"
            val iconRes = R.drawable.notification_icon

            val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(iconRes)
                .setCustomContentView(compactViews)
                .setCustomBigContentView(expandedViews)
                .setContentTitle(title)
                .setContentText(summary)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(piMain)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)

            return builder.build()
        } catch (_: Exception) {
            return null
        }
    }

    fun updateNotification(context: Context) {
        try {
            try { DevToggleBridgeServer.start(context) } catch (_: Exception) {}
            val mode = getNotificationMode(context)
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            if (mode == "disabled") {
                nm.cancel(NOTIFICATION_ID)
                try { context.stopService(Intent(context, DevToggleBridgeService::class.java)) } catch (_: Exception) {}
                return
            }

            val notif = buildNotification(context)
            if (notif != null) {
                nm.notify(NOTIFICATION_ID, notif)
                try {
                    val serviceIntent = Intent(context, DevToggleBridgeService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent)
                    } else {
                        context.startService(serviceIntent)
                    }
                } catch (_: Exception) {}
            } else {
                nm.cancel(NOTIFICATION_ID)
                try { context.stopService(Intent(context, DevToggleBridgeService::class.java)) } catch (_: Exception) {}
            }
        } catch (_: Exception) {}
    }
}
