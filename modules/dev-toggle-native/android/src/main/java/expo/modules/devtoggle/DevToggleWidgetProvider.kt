package expo.modules.devtoggle

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.provider.Settings
import android.widget.RemoteViews
import android.widget.Toast

class DevToggleWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_TOGGLE_DEV = "expo.modules.devtoggle.ACTION_TOGGLE_DEV"
        const val ACTION_TOGGLE_USB = "expo.modules.devtoggle.ACTION_TOGGLE_USB"
        const val ACTION_TOGGLE_WIRELESS = "expo.modules.devtoggle.ACTION_TOGGLE_WIRELESS"

        private const val DEV_KEY = "development_settings_enabled"
        private const val USB_KEY = "adb_enabled"
        private const val WIRELESS_KEY = "adb_wifi_enabled"

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, DevToggleWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                if (appWidgetIds.isNotEmpty()) {
                    val views = buildRemoteViews(context)
                    appWidgetManager.updateAppWidget(thisWidget, views)
                }
            } catch (_: Exception) {}
        }

        fun buildRemoteViews(context: Context): RemoteViews {
            val cr = context.contentResolver
            val devOn = try { Settings.Global.getInt(cr, DEV_KEY, 0) == 1 } catch (_: Exception) { false }
            val usbOn = try { Settings.Global.getInt(cr, USB_KEY, 0) == 1 } catch (_: Exception) { false }
            val wirelessOn = try { Settings.Global.getInt(cr, WIRELESS_KEY, 0) == 1 } catch (_: Exception) { false }

            val views = RemoteViews(context.packageName, R.layout.dev_toggle_widget)

            // Theme colors:
            // Active: #15803D background, #FFFFFF text/icon
            // Inactive: #0E1D17 background, #7A9988 text, #5C7A6B icon
            val colorActiveText = Color.parseColor("#FFFFFF")
            val colorInactiveText = Color.parseColor("#7A9988")
            val colorInactiveIcon = Color.parseColor("#5C7A6B")

            // 1. Developer Options
            views.setInt(
                R.id.btn_dev,
                "setBackgroundResource",
                if (devOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            )
            views.setTextColor(R.id.tv_dev, if (devOn) colorActiveText else colorInactiveText)
            views.setInt(R.id.iv_dev, "setColorFilter", if (devOn) colorActiveText else colorInactiveIcon)
            views.setOnClickPendingIntent(R.id.btn_dev, getPendingIntent(context, ACTION_TOGGLE_DEV, 101))

            // 2. USB Debugging
            views.setInt(
                R.id.btn_usb,
                "setBackgroundResource",
                if (usbOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            )
            views.setTextColor(R.id.tv_usb, if (usbOn) colorActiveText else colorInactiveText)
            views.setInt(R.id.iv_usb, "setColorFilter", if (usbOn) colorActiveText else colorInactiveIcon)
            views.setOnClickPendingIntent(R.id.btn_usb, getPendingIntent(context, ACTION_TOGGLE_USB, 102))

            // 3. Wireless Debugging
            views.setInt(
                R.id.btn_wireless,
                "setBackgroundResource",
                if (wirelessOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            )
            views.setTextColor(R.id.tv_wireless, if (wirelessOn) colorActiveText else colorInactiveText)
            views.setInt(R.id.iv_wireless, "setColorFilter", if (wirelessOn) colorActiveText else colorInactiveIcon)
            views.setOnClickPendingIntent(R.id.btn_wireless, getPendingIntent(context, ACTION_TOGGLE_WIRELESS, 103))

            return views
        }

        private fun getPendingIntent(context: Context, action: String, requestCode: Int): PendingIntent {
            val intent = Intent(context, DevToggleWidgetProvider::class.java).apply {
                this.action = action
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            return PendingIntent.getBroadcast(context, requestCode, intent, flags)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        val cr = context.contentResolver
        when (intent.action) {
            ACTION_TOGGLE_DEV -> {
                val current = try { Settings.Global.getInt(cr, DEV_KEY, 0) == 1 } catch (_: Exception) { false }
                val next = if (current) 0 else 1
                try {
                    val success = Settings.Global.putInt(cr, DEV_KEY, next)
                    if (success) {
                        Toast.makeText(context, if (next == 1) "Developer Options: ON" else "Developer Options: OFF", Toast.LENGTH_SHORT).show()
                    }
                } catch (_: Exception) {
                    Toast.makeText(context, "Permission Required: Run ADB grant command", Toast.LENGTH_SHORT).show()
                }
                updateAllWidgets(context)
            }
            ACTION_TOGGLE_USB -> {
                val current = try { Settings.Global.getInt(cr, USB_KEY, 0) == 1 } catch (_: Exception) { false }
                val next = if (current) 0 else 1
                try {
                    val success = Settings.Global.putInt(cr, USB_KEY, next)
                    if (success) {
                        Toast.makeText(context, if (next == 1) "USB Debugging: ON" else "USB Debugging: OFF", Toast.LENGTH_SHORT).show()
                    }
                } catch (_: Exception) {
                    Toast.makeText(context, "Permission Required: Run ADB grant command", Toast.LENGTH_SHORT).show()
                }
                updateAllWidgets(context)
            }
            ACTION_TOGGLE_WIRELESS -> {
                val current = try { Settings.Global.getInt(cr, WIRELESS_KEY, 0) == 1 } catch (_: Exception) { false }
                val next = if (current) 0 else 1
                try {
                    val success = Settings.Global.putInt(cr, WIRELESS_KEY, next)
                    if (success) {
                        Toast.makeText(context, if (next == 1) "Wireless Debugging: ON" else "Wireless Debugging: OFF", Toast.LENGTH_SHORT).show()
                    }
                } catch (_: Exception) {
                    Toast.makeText(context, "Permission Required: Run ADB grant command", Toast.LENGTH_SHORT).show()
                }
                updateAllWidgets(context)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val views = buildRemoteViews(context)
        for (appWidgetId in appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}

