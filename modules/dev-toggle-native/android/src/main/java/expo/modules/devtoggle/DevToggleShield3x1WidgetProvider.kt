package expo.modules.devtoggle

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.view.View
import android.widget.RemoteViews

class DevToggleShield3x1WidgetProvider : AppWidgetProvider() {

    companion object {
        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val comp = ComponentName(context, DevToggleShield3x1WidgetProvider::class.java)
                val ids = appWidgetManager.getAppWidgetIds(comp)
                if (ids.isNotEmpty()) {
                    val views = buildRemoteViews(context)
                    for (id in ids) {
                        appWidgetManager.updateAppWidget(id, views)
                    }
                }
            } catch (_: Exception) {}
        }

        fun buildRemoteViews(context: Context): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.dev_toggle_shield_3x1_widget)
            val packages = AppShieldManager.getProtectedPackages(context)

            val slots = listOf(
                Triple(R.id.slot_1_root, R.id.iv_slot_1_icon, Pair(R.id.tv_slot_1_label, R.id.tv_slot_1_status)),
                Triple(R.id.slot_2_root, R.id.iv_slot_2_icon, Pair(R.id.tv_slot_2_label, R.id.tv_slot_2_status)),
                Triple(R.id.slot_3_root, R.id.iv_slot_3_icon, Pair(R.id.tv_slot_3_label, R.id.tv_slot_3_status))
            )

            for (i in 0 until 3) {
                val (rootId, iconId, textIds) = slots[i]
                val (labelId, statusId) = textIds
                val pkg = packages.getOrNull(i)

                if (pkg != null) {
                    val appLabel = AppShieldManager.getAppLabel(context, pkg)
                    val bitmap = AppShieldManager.getBadgedAppBitmap(context, pkg, 128)
                    if (bitmap != null) {
                        views.setImageViewBitmap(iconId, bitmap)
                    } else {
                        views.setImageViewResource(iconId, R.drawable.white_icon)
                    }
                    views.setTextViewText(labelId, appLabel)
                    views.setTextViewText(statusId, "SHIELD")
                    views.setViewVisibility(rootId, View.VISIBLE)

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
                    val pi = PendingIntent.getActivity(context, 6000 + i, launchIntent, flags)
                    views.setOnClickPendingIntent(rootId, pi)
                } else {
                    views.setImageViewResource(iconId, R.drawable.widget_icon_off)
                    views.setTextViewText(labelId, "+ Add")
                    views.setTextViewText(statusId, "EMPTY")

                    val openIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                    if (openIntent != null) {
                        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        } else {
                            PendingIntent.FLAG_UPDATE_CURRENT
                        }
                        val pi = PendingIntent.getActivity(context, 6000 + i, openIntent, flags)
                        views.setOnClickPendingIntent(rootId, pi)
                    }
                }
            }

            return views
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val views = buildRemoteViews(context)
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}

