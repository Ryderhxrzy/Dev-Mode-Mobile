package expo.modules.devtoggle

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.provider.Settings
import android.util.Base64
import android.widget.Toast
import java.io.ByteArrayOutputStream
import java.util.concurrent.ConcurrentHashMap

object AppShieldManager {
    private const val PREFS_NAME = "devtoggle_app_shield_prefs"
    private const val KEY_ENABLED = "app_shield_enabled"
    private const val KEY_PACKAGES = "app_shield_packages"

    private var wasDevOptionsDisabledByShield = false
    private var isMonitoring = false
    private val handler = Handler(Looper.getMainLooper())
    private val iconCache = ConcurrentHashMap<String, String>()

    fun isEnabled(context: Context): Boolean {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_ENABLED, false)
    }

    fun setEnabled(context: Context, enabled: Boolean): Boolean {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ENABLED, enabled)
            .apply()

        if (enabled) {
            startMonitoring(context.applicationContext)
        } else {
            stopMonitoring()
            if (wasDevOptionsDisabledByShield) {
                restoreDevOptions(context)
            }
        }
        return true
    }

    fun getProtectedPackages(context: Context): List<String> {
        val set = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getStringSet(KEY_PACKAGES, emptySet()) ?: emptySet()
        return set.toList()
    }

    fun setProtectedPackages(context: Context, packages: List<String>): Boolean {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(KEY_PACKAGES, packages.toSet())
            .apply()
        try {
            DevToggleShield3x1WidgetProvider.updateAllWidgets(context)
            DevToggleShield1x1WidgetProvider.updateAllWidgets(context)
        } catch (_: Exception) {}
        return true
    }

    fun hasUsageAccess(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun openUsageAccessSettings(context: Context): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun getForegroundPackage(context: Context): String? {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
        val endTime = System.currentTimeMillis()
        val beginTime = endTime - 10000 // Last 10 seconds

        if (hasUsageAccess(context)) {
            val events = usm.queryEvents(beginTime, endTime)
            val event = UsageEvents.Event()
            var currentPackage: String? = null
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                    currentPackage = event.packageName
                }
            }
            if (currentPackage != null) return currentPackage
        }
        return null
    }

    private fun getAppIconBase64(pm: PackageManager, app: ApplicationInfo, launchIntent: Intent?): String? {
        iconCache[app.packageName]?.let { return it }
        return try {
            val drawable: Drawable = (if (launchIntent != null) {
                try { pm.getActivityIcon(launchIntent) } catch (_: Throwable) { null }
            } else null) ?: try {
                app.loadIcon(pm)
            } catch (_: Throwable) {
                try {
                    pm.getApplicationIcon(app.packageName)
                } catch (_: Throwable) {
                    pm.defaultActivityIcon
                }
            } ?: pm.defaultActivityIcon

            val targetSize = 96
            val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null && !drawable.bitmap.isRecycled) {
                val orig = drawable.bitmap
                if (orig.width == targetSize && orig.height == targetSize) {
                    orig
                } else {
                    Bitmap.createScaledBitmap(orig, targetSize, targetSize, true)
                }
            } else {
                val bmp = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bmp)
                drawable.setBounds(0, 0, targetSize, targetSize)
                drawable.draw(canvas)
                bmp
            }

            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 85, stream)
            val bytes = stream.toByteArray()
            val base64 = "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
            iconCache[app.packageName] = base64
            base64
        } catch (_: Throwable) {
            null
        }
    }

    fun getInstalledApps(context: Context): List<Map<String, Any>> {
        val pm = context.packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        val result = mutableListOf<Map<String, Any>>()

        for (app in apps) {
            if (app.packageName == context.packageName) continue
            val launchIntent = pm.getLaunchIntentForPackage(app.packageName)
            if (launchIntent != null) {
                val label = pm.getApplicationLabel(app).toString()
                val isSystem = (app.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                val iconBase64 = getAppIconBase64(pm, app, launchIntent) ?: ""
                result.add(
                    mapOf(
                        "packageName" to app.packageName,
                        "appName" to label,
                        "isSystem" to isSystem,
                        "icon" to iconBase64
                    )
                )
            }
        }
        return result.sortedBy { (it["appName"] as? String)?.lowercase() ?: "" }
    }

    fun launchProtectedApp(context: Context, packageName: String): Boolean {
        try {
            val pm = context.packageManager
            val intent = pm.getLaunchIntentForPackage(packageName) ?: return false
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            val cr = context.contentResolver
            val isDevOn = Settings.Global.getInt(cr, "development_settings_enabled", 0) == 1
            if (isDevOn) {
                wasDevOptionsDisabledByShield = true
                writeDevOptions(context, 0)
                try {
                    val appLabel = pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0))
                    Toast.makeText(context, "Dev Mode paused for $appLabel", Toast.LENGTH_SHORT).show()
                } catch (_: Exception) {}
            }

            startMonitoring(context.applicationContext)
            context.startActivity(intent)
            return true
        } catch (_: Exception) {
            return false
        }
    }

    fun startMonitoring(context: Context) {
        if (isMonitoring) return
        isMonitoring = true

        val checkRunnable = object : Runnable {
            override fun run() {
                if (!isMonitoring) return
                try {
                    val currentForeground = getForegroundPackage(context)
                    val protectedList = getProtectedPackages(context)

                    if (currentForeground != null && currentForeground != context.packageName) {
                        val isProtected = protectedList.contains(currentForeground)
                        val isDevOn = Settings.Global.getInt(context.contentResolver, "development_settings_enabled", 0) == 1

                        if (isProtected) {
                            if (isDevOn) {
                                wasDevOptionsDisabledByShield = true
                                writeDevOptions(context, 0)
                                Toast.makeText(context, "Dev Mode auto-disabled for protected app", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            if (wasDevOptionsDisabledByShield && !isDevOn) {
                                wasDevOptionsDisabledByShield = false
                                writeDevOptions(context, 1)
                                Toast.makeText(context, "Dev Mode restored", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                } catch (_: Exception) {}

                handler.postDelayed(this, 500)
            }
        }

        handler.post(checkRunnable)
    }

    fun stopMonitoring() {
        isMonitoring = false
        handler.removeCallbacksAndMessages(null)
    }

    private fun writeDevOptions(context: Context, value: Int) {
        var written = false
        try {
            written = Settings.Global.putInt(context.contentResolver, "development_settings_enabled", value)
            if (value == 0) {
                try { Settings.Global.putInt(context.contentResolver, "adb_enabled", 0) } catch (_: Exception) {}
                try { Settings.Global.putInt(context.contentResolver, "adb_wifi_enabled", 0) } catch (_: Exception) {}
            }
        } catch (_: Exception) {}

        if (!written) {
            // Check Shizuku
            try {
                if (rikka.shizuku.Shizuku.pingBinder() && rikka.shizuku.Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED) {
                    val method = rikka.shizuku.Shizuku::class.java.getDeclaredMethod(
                        "newProcess",
                        Array<String>::class.java,
                        Array<String>::class.java,
                        String::class.java
                    )
                    method.isAccessible = true
                    val p = method.invoke(null, arrayOf("sh", "-c", "settings put global development_settings_enabled $value"), null, null) as java.lang.Process
                    p.waitFor()
                    if (value == 0) {
                        val p2 = method.invoke(null, arrayOf("sh", "-c", "settings put global adb_enabled 0"), null, null) as java.lang.Process
                        p2.waitFor()
                    }
                    written = true
                }
            } catch (_: Exception) {}
        }

        if (!written) {
            try {
                Runtime.getRuntime().exec(arrayOf("settings", "put", "global", "development_settings_enabled", value.toString())).waitFor()
            } catch (_: Exception) {}
        }

        try { DevToggleWidgetProvider.updateAllWidgets(context) } catch (_: Exception) {}
        try { DevToggleNotificationManager.updateNotification(context) } catch (_: Exception) {}
    }

    private fun restoreDevOptions(context: Context) {
        wasDevOptionsDisabledByShield = false
        writeDevOptions(context, 1)
    }

    fun getAppLabel(context: Context, packageName: String): String {
        return try {
            val pm = context.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (_: Exception) {
            packageName
        }
    }

    fun getBadgedAppBitmap(context: Context, packageName: String, targetSize: Int = 192): Bitmap? {
        return try {
            val pm = context.packageManager
            val launchIntent = pm.getLaunchIntentForPackage(packageName)
            val drawable: Drawable = (if (launchIntent != null) {
                try { pm.getActivityIcon(launchIntent) } catch (_: Throwable) { null }
            } else null) ?: try {
                pm.getApplicationIcon(packageName)
            } catch (_: Throwable) {
                pm.defaultActivityIcon
            } ?: pm.defaultActivityIcon

            val baseBitmap = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(baseBitmap)
            drawable.setBounds(0, 0, targetSize, targetSize)
            drawable.draw(canvas)

            // Draw Cyber Shield Badge on bottom-right corner
            val badgeSize = (targetSize * 0.42f).toInt()
            val badgeRadius = badgeSize / 2f
            val badgeCenterX = targetSize - badgeRadius - 4f
            val badgeCenterY = targetSize - badgeRadius - 4f

            val paint = Paint(Paint.ANTI_ALIAS_FLAG)

            // 1. Outer dark cyber ring
            paint.color = Color.parseColor("#050D0A")
            paint.style = Paint.Style.FILL
            canvas.drawCircle(badgeCenterX, badgeCenterY, badgeRadius + 4f, paint)

            // 2. Emerald Cyber Green disc
            paint.color = Color.parseColor("#22C55E")
            canvas.drawCircle(badgeCenterX, badgeCenterY, badgeRadius, paint)

            // 3. Crisp white shield emblem inside badge
            val shieldPath = Path()
            val sw = badgeSize * 0.54f
            val sh = badgeSize * 0.64f
            val sl = badgeCenterX - sw / 2f
            val st = badgeCenterY - sh / 2f

            shieldPath.moveTo(sl, st + sh * 0.18f)
            shieldPath.quadTo(sl + sw * 0.5f, st - sh * 0.08f, sl + sw, st + sh * 0.18f)
            shieldPath.quadTo(sl + sw, st + sh * 0.62f, sl + sw * 0.5f, st + sh)
            shieldPath.quadTo(sl, st + sh * 0.62f, sl, st + sh * 0.18f)
            shieldPath.close()

            paint.color = Color.WHITE
            paint.style = Paint.Style.FILL
            canvas.drawPath(shieldPath, paint)

            // 4. Emerald checkmark inside the shield
            paint.color = Color.parseColor("#15803D")
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = badgeSize * 0.09f
            paint.strokeCap = Paint.Cap.ROUND
            paint.strokeJoin = Paint.Join.ROUND
            val checkPath = Path()
            checkPath.moveTo(sl + sw * 0.28f, st + sh * 0.48f)
            checkPath.lineTo(sl + sw * 0.45f, st + sh * 0.65f)
            checkPath.lineTo(sl + sw * 0.74f, st + sh * 0.35f)
            canvas.drawPath(checkPath, paint)

            baseBitmap
        } catch (_: Exception) {
            null
        }
    }

    fun isWidgetPinningSupported(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
            return appWidgetManager?.isRequestPinAppWidgetSupported == true
        }
        return false
    }

    fun requestPinShieldWidget1x1(context: Context, packageName: String): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
            if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported) {
                val provider = android.content.ComponentName(context, DevToggleShield1x1WidgetProvider::class.java)
                val callbackIntent = Intent(context, DevToggleShieldWidgetPinReceiver::class.java).apply {
                    putExtra("package_name", packageName)
                }
                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_MUTABLE
                } else {
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT
                }
                val successCallback = android.app.PendingIntent.getBroadcast(
                    context,
                    packageName.hashCode(),
                    callbackIntent,
                    flags
                )
                val result = appWidgetManager.requestPinAppWidget(provider, null, successCallback)
                if (result) {
                    val label = getAppLabel(context, packageName)
                    Toast.makeText(context, "Requesting 1x1 Shield Widget for $label", Toast.LENGTH_SHORT).show()
                }
                return result
            }
        }
        return false
    }

    fun requestPinShieldWidget3x1(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
            if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported) {
                val provider = android.content.ComponentName(context, DevToggleShield3x1WidgetProvider::class.java)
                val result = appWidgetManager.requestPinAppWidget(provider, null, null)
                if (result) {
                    Toast.makeText(context, "Requesting 3x1 Shield Dock Widget", Toast.LENGTH_SHORT).show()
                }
                return result
            }
        }
        return false
    }

    fun createShieldedShortcut(context: Context, packageName: String): Boolean {
        try {
            val pm = context.packageManager
            val launchIntent = pm.getLaunchIntentForPackage(packageName) ?: return false
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            val appLabel = getAppLabel(context, packageName)
            val baseBitmap = getBadgedAppBitmap(context, packageName, 192) ?: return false

            // Use official launchIntent so Android system launcher recognizes it immediately
            val shortcutIntent = Intent(launchIntent).apply {
                action = Intent.ACTION_MAIN
                addCategory(Intent.CATEGORY_LAUNCHER)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val shortcutManager = context.getSystemService(ShortcutManager::class.java)
                if (shortcutManager != null && shortcutManager.isRequestPinShortcutSupported) {
                    val pinShortcutInfo = ShortcutInfo.Builder(context, "shield_$packageName")
                        .setShortLabel(appLabel)
                        .setLongLabel("$appLabel (Shielded)")
                        .setIcon(Icon.createWithBitmap(baseBitmap))
                        .setIntent(shortcutIntent)
                        .build()

                    shortcutManager.requestPinShortcut(pinShortcutInfo, null)
                    Toast.makeText(context, "Shielded shortcut created for $appLabel", Toast.LENGTH_SHORT).show()
                    return true
                }
            }

            // Legacy broadcast for pre-Oreo / compatible launchers
            val addIntent = Intent("com.android.launcher.action.INSTALL_SHORTCUT").apply {
                putExtra(Intent.EXTRA_SHORTCUT_INTENT, shortcutIntent)
                putExtra(Intent.EXTRA_SHORTCUT_NAME, appLabel)
                putExtra(Intent.EXTRA_SHORTCUT_ICON, baseBitmap)
                putExtra("duplicate", false)
            }
            context.sendBroadcast(addIntent)
            Toast.makeText(context, "Shielded shortcut created for $appLabel", Toast.LENGTH_SHORT).show()
            return true
        } catch (_: Exception) {
            return false
        }
    }
}
