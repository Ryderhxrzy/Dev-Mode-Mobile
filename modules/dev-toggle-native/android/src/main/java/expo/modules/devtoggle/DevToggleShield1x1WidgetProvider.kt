package expo.modules.devtoggle

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews

class DevToggleShield1x1WidgetProvider : AppWidgetProvider() {

    companion object {
        private const val PREFS_NAME = "devtoggle_shield_widget_prefs"
        private const val KEY_PREFIX_PKG = "shield_1x1_pkg_"

        fun setWidgetPackage(context: Context, appWidgetId: Int, packageName: String) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString("$KEY_PREFIX_PKG$appWidgetId", packageName)
                .apply()
        }

        fun getWidgetPackage(context: Context, appWidgetId: Int): String? {
            val saved = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString("$KEY_PREFIX_PKG$appWidgetId", null)
            if (!saved.isNullOrBlank()) return saved
            return AppShieldManager.getProtectedPackages(context).firstOrNull()
        }

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val comp = ComponentName(context, DevToggleShield1x1WidgetProvider::class.java)
                val ids = appWidgetManager.getAppWidgetIds(comp)
                for (id in ids) {
                    val views = buildRemoteViews(context, id)
                    appWidgetManager.updateAppWidget(id, views)
                }
            } catch (_: Exception) {}
        }

        fun buildRemoteViews(context: Context, appWidgetId: Int): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.dev_toggle_shield_1x1_widget)
            val pkg = getWidgetPackage(context, appWidgetId)

            if (pkg != null) {
                val appLabel = AppShieldManager.getAppLabel(context, pkg)
                val bitmap = AppShieldManager.getBadgedAppBitmap(context, pkg, 128)
                if (bitmap != null) {
                    views.setImageViewBitmap(R.id.iv_shield_app_icon, bitmap)
                } else {
                    views.setImageViewResource(R.id.iv_shield_app_icon, R.drawable.white_icon)
                }
                views.setTextViewText(R.id.tv_shield_app_label, appLabel)
                views.setTextViewText(R.id.tv_shield_app_status, "AUTO-OFF")

                // Launch protected app intent
                val launchIntent = Intent(context, WidgetActionActivity::class.java).apply {
                    action = WidgetActionActivity.ACTION_LAUNCH_SHIELDED
                    putExtra("package_name", pkg)
                    setPackage(context.packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or Intent.FLAG_ACTIVITY_NO_ANIMATION)
                }
                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
                val pi = PendingIntent.getActivity(context, 5000 + appWidgetId, launchIntent, flags)
                views.setOnClickPendingIntent(R.id.widget_shield_1x1_root, pi)
            } else {
                views.setTextViewText(R.id.tv_shield_app_label, "No App")
                views.setTextViewText(R.id.tv_shield_app_status, "TAP TO ADD")
                val openIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (openIntent != null) {
                    openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    } else {
                        PendingIntent.FLAG_UPDATE_CURRENT
                    }
                    val pi = PendingIntent.getActivity(context, 5000 + appWidgetId, openIntent, flags)
                    views.setOnClickPendingIntent(R.id.widget_shield_1x1_root, pi)
                }
            }
            return views
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            val views = buildRemoteViews(context, id)
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}

