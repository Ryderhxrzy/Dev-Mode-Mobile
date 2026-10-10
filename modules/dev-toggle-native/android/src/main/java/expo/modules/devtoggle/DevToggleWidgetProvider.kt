package expo.modules.devtoggle

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.widget.RemoteViews
import android.widget.Toast

open class DevToggleWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_TOGGLE_DEV = "expo.modules.devtoggle.ACTION_TOGGLE_DEV"
        const val ACTION_TOGGLE_USB = "expo.modules.devtoggle.ACTION_TOGGLE_USB"
        const val ACTION_TOGGLE_WIRELESS = "expo.modules.devtoggle.ACTION_TOGGLE_WIRELESS"

        private const val DEV_KEY = "development_settings_enabled"
        private const val USB_KEY = "adb_enabled"
        private const val WIRELESS_KEY = "adb_wifi_enabled"

        fun showToast(context: Context, message: String) {
            val show = {
                try {
                    Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
                } catch (_: Exception) {
                    try {
                        Toast.makeText(context.applicationContext, message, Toast.LENGTH_SHORT).show()
                    } catch (_: Exception) {}
                }
            }

            if (Looper.myLooper() == Looper.getMainLooper()) {
                show()
            } else {
                Handler(Looper.getMainLooper()).post { show() }
            }
        }

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)

                // 1. 3x1 Widget
                val comp3x1 = ComponentName(context, DevToggleWidgetProvider::class.java)
                val ids3x1 = appWidgetManager.getAppWidgetIds(comp3x1)
                if (ids3x1.isNotEmpty()) {
                    appWidgetManager.updateAppWidget(comp3x1, buildRemoteViews(context))
                }

                // 2. Dev Mode 1x1 Widget
                val compDev = ComponentName(context, DevToggleSingleDevWidgetProvider::class.java)
                val idsDev = appWidgetManager.getAppWidgetIds(compDev)
                if (idsDev.isNotEmpty()) {
                    appWidgetManager.updateAppWidget(compDev, buildSingleDevRemoteViews(context))
                }

                // 3. USB 1x1 Widget
                val compUsb = ComponentName(context, DevToggleSingleUsbWidgetProvider::class.java)
                val idsUsb = appWidgetManager.getAppWidgetIds(compUsb)
                if (idsUsb.isNotEmpty()) {
                    appWidgetManager.updateAppWidget(compUsb, buildSingleUsbRemoteViews(context))
                }

                // 4. Wireless 1x1 Widget
                val compWireless = ComponentName(context, DevToggleSingleWirelessWidgetProvider::class.java)
                val idsWireless = appWidgetManager.getAppWidgetIds(compWireless)
                if (idsWireless.isNotEmpty()) {
                    appWidgetManager.updateAppWidget(compWireless, buildSingleWirelessRemoteViews(context))
                }
            } catch (_: Exception) {}
        }

        fun buildRemoteViews(context: Context): RemoteViews {
            val cr = context.contentResolver
            val devOn = try { Settings.Global.getInt(cr, DEV_KEY, 0) == 1 } catch (_: Exception) { false }
            val usbOn = try { Settings.Global.getInt(cr, USB_KEY, 0) == 1 } catch (_: Exception) { false }
            val wirelessOn = try { Settings.Global.getInt(cr, WIRELESS_KEY, 0) == 1 } catch (_: Exception) { false }

            val views = RemoteViews(context.packageName, R.layout.dev_toggle_widget)

            val colorActiveText = Color.parseColor("#FFFFFF")
            val colorActiveStatus = Color.parseColor("#FFFFFF")
            val colorInactiveText = Color.parseColor("#7A9988")
            val colorInactiveStatus = Color.parseColor("#5C7A6B")
            val colorInactiveIcon = Color.parseColor("#5C7A6B")

            // 1. Developer Options
            val piDev = getPendingIntent(context, ACTION_TOGGLE_DEV, 101)
            views.setInt(
                R.id.btn_dev,
                "setBackgroundResource",
                if (devOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            )
            views.setTextColor(R.id.tv_dev, if (devOn) colorActiveText else colorInactiveText)
            views.setTextViewText(R.id.tv_dev_status, if (devOn) "ON" else "OFF")
            views.setTextColor(R.id.tv_dev_status, if (devOn) colorActiveStatus else colorInactiveStatus)
            val devIconRes = if (devOn) R.drawable.white_icon else R.drawable.widget_icon_off
            views.setImageViewResource(R.id.iv_dev, devIconRes)
            views.setInt(R.id.iv_dev, "setImageAlpha", 255)
            views.setOnClickPendingIntent(R.id.btn_dev, piDev)
            views.setOnClickPendingIntent(R.id.iv_dev, piDev)
            views.setOnClickPendingIntent(R.id.tv_dev, piDev)
            views.setOnClickPendingIntent(R.id.tv_dev_status, piDev)

            // 2. USB Debugging
            val piUsb = getPendingIntent(context, ACTION_TOGGLE_USB, 102)
            views.setInt(
                R.id.btn_usb,
                "setBackgroundResource",
                if (usbOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            )
            views.setTextColor(R.id.tv_usb, if (usbOn) colorActiveText else colorInactiveText)
            views.setTextViewText(R.id.tv_usb_status, if (usbOn) "ON" else "OFF")
            views.setTextColor(R.id.tv_usb_status, if (usbOn) colorActiveStatus else colorInactiveStatus)
            views.setInt(R.id.iv_usb, "setColorFilter", if (usbOn) colorActiveText else colorInactiveIcon)
            views.setOnClickPendingIntent(R.id.btn_usb, piUsb)
            views.setOnClickPendingIntent(R.id.iv_usb, piUsb)
            views.setOnClickPendingIntent(R.id.tv_usb, piUsb)
            views.setOnClickPendingIntent(R.id.tv_usb_status, piUsb)

            // 3. Wireless Debugging
            val piWifi = getPendingIntent(context, ACTION_TOGGLE_WIRELESS, 103)
            views.setInt(
                R.id.btn_wireless,
                "setBackgroundResource",
                if (wirelessOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            )
            views.setTextColor(R.id.tv_wireless, if (wirelessOn) colorActiveText else colorInactiveText)
            if (wirelessOn) {
                val ep = AdbEndpointHelper.getEndpoint(context)
                if (ep != null && ep.contains(":")) {
                    views.setTextViewText(R.id.tv_wireless_status, ":${ep.substringAfter(":")}")
                } else if (ep != null) {
                    views.setTextViewText(R.id.tv_wireless_status, "ON")
                } else {
                    views.setTextViewText(R.id.tv_wireless_status, "NO WI-FI")
                }
            } else {
                views.setTextViewText(R.id.tv_wireless_status, "OFF")
            }
            views.setTextColor(R.id.tv_wireless_status, if (wirelessOn) colorActiveStatus else colorInactiveStatus)
            views.setInt(R.id.iv_wireless, "setColorFilter", if (wirelessOn) colorActiveText else colorInactiveIcon)
            views.setOnClickPendingIntent(R.id.btn_wireless, piWifi)
            views.setOnClickPendingIntent(R.id.iv_wireless, piWifi)
            views.setOnClickPendingIntent(R.id.tv_wireless, piWifi)
            views.setOnClickPendingIntent(R.id.tv_wireless_status, piWifi)

            return views
        }

        fun buildSingleDevRemoteViews(context: Context): RemoteViews {
            val cr = context.contentResolver
            val devOn = try { Settings.Global.getInt(cr, DEV_KEY, 0) == 1 } catch (_: Exception) { false }
            val views = RemoteViews(context.packageName, R.layout.dev_toggle_single_dev_widget)

            val colorActiveText = Color.parseColor("#FFFFFF")
            val colorActiveStatus = Color.parseColor("#FFFFFF")
            val colorInactiveText = Color.parseColor("#7A9988")
            val colorInactiveStatus = Color.parseColor("#5C7A6B")

            val pi = getPendingIntent(context, ACTION_TOGGLE_DEV, 201)
            views.setInt(
                R.id.btn_single_dev,
                "setBackgroundResource",
                if (devOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            )
            views.setTextColor(R.id.tv_single_dev_label, if (devOn) colorActiveText else colorInactiveText)
            views.setTextViewText(R.id.tv_single_dev_status, if (devOn) "ON" else "OFF")
            views.setTextColor(R.id.tv_single_dev_status, if (devOn) colorActiveStatus else colorInactiveStatus)
            val singleDevIconRes = if (devOn) R.drawable.white_icon else R.drawable.widget_icon_off
            views.setImageViewResource(R.id.iv_single_dev, singleDevIconRes)
            views.setInt(R.id.iv_single_dev, "setImageAlpha", 255)
            views.setOnClickPendingIntent(R.id.btn_single_dev, pi)
            views.setOnClickPendingIntent(R.id.iv_single_dev, pi)
            views.setOnClickPendingIntent(R.id.tv_single_dev_label, pi)
            views.setOnClickPendingIntent(R.id.tv_single_dev_status, pi)

            return views
        }

        fun buildSingleUsbRemoteViews(context: Context): RemoteViews {
            val cr = context.contentResolver
            val usbOn = try { Settings.Global.getInt(cr, USB_KEY, 0) == 1 } catch (_: Exception) { false }
            val views = RemoteViews(context.packageName, R.layout.dev_toggle_single_usb_widget)

            val colorActiveText = Color.parseColor("#FFFFFF")
            val colorActiveStatus = Color.parseColor("#FFFFFF")
            val colorInactiveText = Color.parseColor("#7A9988")
            val colorInactiveStatus = Color.parseColor("#5C7A6B")
            val colorInactiveIcon = Color.parseColor("#5C7A6B")

            val pi = getPendingIntent(context, ACTION_TOGGLE_USB, 202)
            views.setInt(
                R.id.btn_single_usb,
                "setBackgroundResource",
                if (usbOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            )
            views.setTextColor(R.id.tv_single_usb_label, if (usbOn) colorActiveText else colorInactiveText)
            views.setTextViewText(R.id.tv_single_usb_status, if (usbOn) "ON" else "OFF")
            views.setTextColor(R.id.tv_single_usb_status, if (usbOn) colorActiveStatus else colorInactiveStatus)
            views.setInt(R.id.iv_single_usb, "setColorFilter", if (usbOn) colorActiveText else colorInactiveIcon)
            views.setOnClickPendingIntent(R.id.btn_single_usb, pi)
            views.setOnClickPendingIntent(R.id.iv_single_usb, pi)
            views.setOnClickPendingIntent(R.id.tv_single_usb_label, pi)
            views.setOnClickPendingIntent(R.id.tv_single_usb_status, pi)

            return views
        }

        fun buildSingleWirelessRemoteViews(context: Context): RemoteViews {
            val cr = context.contentResolver
            val wirelessOn = try { Settings.Global.getInt(cr, WIRELESS_KEY, 0) == 1 } catch (_: Exception) { false }
            val views = RemoteViews(context.packageName, R.layout.dev_toggle_single_wireless_widget)

            val colorActiveText = Color.parseColor("#FFFFFF")
            val colorActiveStatus = Color.parseColor("#FFFFFF")
            val colorInactiveText = Color.parseColor("#7A9988")
            val colorInactiveStatus = Color.parseColor("#5C7A6B")
            val colorInactiveIcon = Color.parseColor("#5C7A6B")

            val pi = getPendingIntent(context, ACTION_TOGGLE_WIRELESS, 203)
            views.setInt(
                R.id.btn_single_wireless,
                "setBackgroundResource",
                if (wirelessOn) R.drawable.widget_btn_active else R.drawable.widget_btn_inactive
            )
            views.setTextColor(R.id.tv_single_wireless_label, if (wirelessOn) colorActiveText else colorInactiveText)
            views.setTextViewText(R.id.tv_single_wireless_status, if (wirelessOn) "ON" else "OFF")
            views.setTextColor(R.id.tv_single_wireless_status, if (wirelessOn) colorActiveStatus else colorInactiveStatus)
            if (wirelessOn) {
                val ep = AdbEndpointHelper.getEndpoint(context)
                if (ep != null && ep.contains(":")) {
                    views.setTextViewText(R.id.tv_single_wireless_endpoint, ep)
                    views.setTextColor(R.id.tv_single_wireless_endpoint, Color.parseColor("#FFFFFF"))
                } else if (ep != null) {
                    views.setTextViewText(R.id.tv_single_wireless_endpoint, "$ep (Resolving)")
                    views.setTextColor(R.id.tv_single_wireless_endpoint, Color.parseColor("#FFFFFF"))
                } else {
                    views.setTextViewText(R.id.tv_single_wireless_endpoint, "No Wi-Fi Connection")
                    views.setTextColor(R.id.tv_single_wireless_endpoint, Color.parseColor("#FFFFFF"))
                }
            } else {
                views.setTextViewText(R.id.tv_single_wireless_endpoint, "")
            }
            views.setInt(R.id.iv_single_wireless, "setColorFilter", if (wirelessOn) colorActiveText else colorInactiveIcon)
            views.setOnClickPendingIntent(R.id.btn_single_wireless, pi)
            views.setOnClickPendingIntent(R.id.iv_single_wireless, pi)
            views.setOnClickPendingIntent(R.id.tv_single_wireless_label, pi)
            views.setOnClickPendingIntent(R.id.tv_single_wireless_status, pi)
            views.setOnClickPendingIntent(R.id.tv_single_wireless_endpoint, pi)

            return views
        }

        fun getPendingIntent(context: Context, action: String, requestCode: Int): PendingIntent {
            val intent = Intent(context, WidgetActionActivity::class.java).apply {
                this.action = action
                setPackage(context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or Intent.FLAG_ACTIVITY_NO_ANIMATION)
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            return PendingIntent.getActivity(context, requestCode, intent, flags)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        val cr = context.contentResolver
        when (intent.action) {
            ACTION_TOGGLE_DEV -> {
                val current = try { Settings.Global.getInt(cr, DEV_KEY, 0) == 1 } catch (_: Exception) { false }
                val next = if (current) 0 else 1
                val success = try {
                    Settings.Global.putInt(cr, DEV_KEY, next)
                } catch (_: Exception) {
                    false
                }

                if (success) {
                    if (next == 0) {
                        try { Settings.Global.putInt(cr, USB_KEY, 0) } catch (_: Exception) {}
                        try { Settings.Global.putInt(cr, WIRELESS_KEY, 0) } catch (_: Exception) {}
                    }
                    showToast(context, if (next == 1) "Developer Options: Enabled" else "Developer Options: Disabled")
                } else {
                    showToast(context, "Permission Required: Run ADB grant command")
                }
                updateAllWidgets(context)
            }
            ACTION_TOGGLE_USB -> {
                val devOn = try { Settings.Global.getInt(cr, DEV_KEY, 0) == 1 } catch (_: Exception) { false }
                val current = try { Settings.Global.getInt(cr, USB_KEY, 0) == 1 } catch (_: Exception) { false }
                val next = if (current) 0 else 1

                if (next == 1 && !devOn) {
                    showToast(context, "Developer Mode must be ON to enable USB Debugging")
                    updateAllWidgets(context)
                    return
                }

                val success = try {
                    Settings.Global.putInt(cr, USB_KEY, next)
                } catch (_: Exception) {
                    false
                }

                if (success) {
                    showToast(context, if (next == 1) "USB Debugging: Enabled" else "USB Debugging: Disabled")
                } else {
                    showToast(context, "Permission Required: Run ADB grant command")
                }
                updateAllWidgets(context)
            }
            ACTION_TOGGLE_WIRELESS -> {
                val devOn = try { Settings.Global.getInt(cr, DEV_KEY, 0) == 1 } catch (_: Exception) { false }
                val current = try { Settings.Global.getInt(cr, WIRELESS_KEY, 0) == 1 } catch (_: Exception) { false }
                val next = if (current) 0 else 1

                if (next == 1 && !devOn) {
                    showToast(context, "Developer Mode must be ON to enable Wireless Debugging")
                    updateAllWidgets(context)
                    return
                }

                val success = try {
                    Settings.Global.putInt(cr, WIRELESS_KEY, next)
                } catch (_: Exception) {
                    false
                }

                if (success) {
                    showToast(context, if (next == 1) "Wireless Debugging: Enabled" else "Wireless Debugging: Disabled")
                } else {
                    showToast(context, "Permission Required: Run ADB grant command")
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

class DevToggleSingleDevWidgetProvider : DevToggleWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val views = buildSingleDevRemoteViews(context)
        for (appWidgetId in appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}

class DevToggleSingleUsbWidgetProvider : DevToggleWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val views = buildSingleUsbRemoteViews(context)
        for (appWidgetId in appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}

class DevToggleSingleWirelessWidgetProvider : DevToggleWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val views = buildSingleWirelessRemoteViews(context)
        for (appWidgetId in appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
